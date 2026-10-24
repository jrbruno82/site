require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const { promisify } = require("node:util");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const { google } = require("googleapis");
const bulls = require("./data/bulls");
const bullTranslations = require("./data/bull-translations");

const app = express();
const port = Number(process.env.PORT || 3000);
const sheetId = process.env.GOOGLE_SHEET_ID;
const sheetTab = process.env.GOOGLE_SHEET_TAB || "Usuarios";
const frontendOrigins = new Set((process.env.FRONTEND_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean).map((origin) => {
  const parsedOrigin = new URL(origin);
  if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin.replace(/\/+$/, "")) {
    throw new Error("FRONTEND_ORIGINS deve conter apenas origens HTTP/HTTPS, sem caminhos.");
  }
  return parsedOrigin.origin;
}));
const cookieName = "genetica_session";
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const headers = ["email", "name", "password_hash", "role", "active", "created_at"];
const roles = new Set(["master", "admin", "visualizador"]);
const scryptAsync = promisify(crypto.scrypt);
const sessions = new Map();
let usersCache;
let mutationQueue = Promise.resolve();

if (!sheetId) throw new Error("Configure GOOGLE_SHEET_ID antes de iniciar o servidor.");

const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const auth = new google.auth.GoogleAuth({
  ...(serviceAccountJson
    ? { credentials: JSON.parse(serviceAccountJson) }
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS }
      : {}),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((request, response, next) => {
  const origin = request.get("origin");
  if (origin && frontendOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Vary", "Origin");
    if (request.method === "OPTIONS") return response.status(204).end();
  }
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
}));
app.use(express.json({ limit: "16kb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

function sheetRange() {
  return `'${sheetTab.replaceAll("'", "''")}'!A:F`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUser(row, rowNumber) {
  return {
    email: normalizeEmail(row[0]),
    name: String(row[1] || "").trim(),
    passwordHash: String(row[2] || ""),
    role: String(row[3] || ""),
    active: String(row[4] || "").toLowerCase() === "true",
    createdAt: String(row[5] || ""),
    rowNumber,
  };
}

async function readSheetRows() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetRange(),
  });
  const values = response.data.values || [];
  if (!values.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${sheetTab.replaceAll("'", "''")}'!A1:F1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    usersCache = [];
    return [];
  }

  const actualHeaders = values[0].map((value) => String(value).trim().toLowerCase());
  if (headers.some((header, index) => actualHeaders[index] !== header)) {
    throw new Error(`Cabeçalhos inválidos na aba "${sheetTab}". Use, nesta ordem: ${headers.join(", ")}.`);
  }
  return values.slice(1).map((row, index) => normalizeUser(row, index + 2)).filter((user) => user.email);
}

async function getUsers(force = false) {
  if (!force && usersCache && usersCache.expiresAt > Date.now()) return usersCache.users;
  const users = await readSheetRows();
  usersCache = { users, expiresAt: Date.now() + 5000 };
  return users;
}

function invalidateUsersCache() {
  usersCache = undefined;
}

async function appendUser(user) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: sheetRange(),
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[user.email, user.name, user.passwordHash, user.role, String(user.active), user.createdAt]],
    },
  });
  invalidateUsersCache();
}

async function updateUser(user) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${sheetTab.replaceAll("'", "''")}'!A${user.rowNumber}:F${user.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[user.email, user.name, user.passwordHash, user.role, String(user.active), user.createdAt]],
    },
  });
  invalidateUsersCache();
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, cost, saltHex, hashHex] = String(encodedHash).split("$");
  if (algorithm !== "scrypt" || cost !== "16384" || !/^[0-9a-f]{32}$/i.test(saltHex || "") || !/^[0-9a-f]{128}$/i.test(hashHex || "")) {
    await scryptAsync(password, Buffer.alloc(16), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return false;
  }
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(actual, Buffer.from(hashHex, "hex"));
}

function isPrivileged(user) {
  return user.active && (user.role === "master" || user.role === "admin");
}

function publicUser(user) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function cookieValue(request) {
  const cookie = (request.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? cookie.slice(cookieName.length + 1) : "";
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = frontendOrigins.size ? "None" : "Strict";
  response.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${sessionLifetimeMs / 1000}${secure}`);
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const sameSite = frontendOrigins.size ? "None" : "Strict";
  response.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

function verifyOrigin(request, response, next) {
  const origin = request.get("origin");
  if (!origin) return response.status(403).json({ error: "Origem da solicitação não autorizada." });
  try {
    const originUrl = new URL(origin);
    const sameOrigin = originUrl.host === request.get("host");
    if (!sameOrigin && !frontendOrigins.has(originUrl.origin)) {
      return response.status(403).json({ error: "Origem da solicitação não autorizada." });
    }
  } catch {
    return response.status(403).json({ error: "Origem da solicitação não autorizada." });
  }
  next();
}

async function requireSession(request, response, next) {
  try {
    const token = cookieValue(request);
    const session = sessions.get(token);
    if (!token || !session || session.expiresAt <= Date.now()) {
      sessions.delete(token);
      clearSessionCookie(response);
      return response.status(401).json({ error: "Faça login para continuar." });
    }
    const users = await getUsers();
    const user = users.find((candidate) => candidate.email === session.email && candidate.active);
    if (!user) {
      sessions.delete(token);
      clearSessionCookie(response);
      return response.status(401).json({ error: "Sessão encerrada. Entre novamente." });
    }
    request.sessionToken = token;
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireUserManagement(request, response, next) {
  if (!isPrivileged(request.user)) {
    return response.status(403).json({ error: "Apenas usuários master e admin podem gerenciar contas." });
  }
  next();
}

function runUserMutation(action) {
  const result = mutationQueue.then(action);
  mutationQueue = result.catch(() => {});
  return result;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function validPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 128;
}

async function bootstrapAdmin() {
  const users = await getUsers(true);
  if (users.some(isPrivileged)) return;
  const email = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!validEmail(email) || !validPassword(password)) {
    throw new Error("Não há uma conta master/admin ativa. Configure INITIAL_ADMIN_EMAIL e uma INITIAL_ADMIN_PASSWORD com pelo menos 12 caracteres.");
  }
  await appendUser({
    email,
    name: String(process.env.INITIAL_ADMIN_NAME || "Administrador").trim(),
    passwordHash: await hashPassword(password),
    role: "master",
    active: true,
    createdAt: new Date().toISOString(),
  });
}

app.use("/api", (request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

app.post("/api/login", loginLimiter, verifyOrigin, async (request, response, next) => {
  try {
    const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
    const email = normalizeEmail(body.email);
    const password = body.password;
    if (!validEmail(email) || typeof password !== "string" || password.length > 128) {
      return response.status(401).json({ error: "E-mail ou senha inválidos, ou conta inativa." });
    }
    const users = await getUsers();
    const user = users.find((candidate) => candidate.email === email);
    const passwordValid = await verifyPassword(password, user?.passwordHash || "");
    if (!user || !user.active || !passwordValid) {
      return response.status(401).json({ error: "E-mail ou senha inválidos, ou conta inativa." });
    }
    for (const [sessionId, session] of sessions) {
      if (session.expiresAt <= Date.now()) sessions.delete(sessionId);
    }
    const token = crypto.randomBytes(32).toString("base64url");
    sessions.set(token, { email: user.email, expiresAt: Date.now() + sessionLifetimeMs });
    setSessionCookie(response, token);
    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/logout", verifyOrigin, (request, response) => {
  sessions.delete(cookieValue(request));
  clearSessionCookie(response);
  response.status(204).end();
});

app.get("/api/session", requireSession, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

app.get("/api/health", (request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/bulls", requireSession, (request, response) => {
  const language = ["pt-BR", "en-US", "es"].includes(request.query.lang) ? request.query.lang : "pt-BR";
  response.json(bulls.map((bull) => ({
    ...bull,
    details: language === "pt-BR" ? bull.details : bullTranslations[bull.id]?.[language] || bull.details,
  })));
});

app.get("/api/users", requireSession, requireUserManagement, async (request, response, next) => {
  try {
    const users = await getUsers();
    response.json(users.map(publicUser));
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", verifyOrigin, requireSession, requireUserManagement, async (request, response, next) => {
  try {
    const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
    const email = normalizeEmail(body.email);
    const name = String(body.name || "").trim();
    const password = body.password;
    const role = body.role;
    if (!validEmail(email) || !name || name.length > 100 || !validPassword(password) || !roles.has(role)) {
      return response.status(400).json({ error: "Informe nome, e-mail válido, senha com ao menos 12 caracteres e um perfil permitido." });
    }
    const user = await runUserMutation(async () => {
      const users = await getUsers(true);
      if (users.some((candidate) => candidate.email === email)) {
        const error = new Error("Já existe uma conta com este e-mail.");
        error.status = 409;
        throw error;
      }
      const created = {
        email,
        name,
        passwordHash: await hashPassword(password),
        role,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await appendUser(created);
      return created;
    });
    response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/users/:email", verifyOrigin, requireSession, requireUserManagement, async (request, response, next) => {
  try {
    const targetEmail = normalizeEmail(request.params.email);
    const user = await runUserMutation(async () => {
      const users = await getUsers(true);
      const target = users.find((candidate) => candidate.email === targetEmail);
      if (!target) {
        const error = new Error("Usuário não encontrado.");
        error.status = 404;
        throw error;
      }
      const body = request.body && typeof request.body === "object" && !Array.isArray(request.body) ? request.body : {};
      const nextRole = body.role === undefined ? target.role : body.role;
      const nextActive = body.active === undefined ? target.active : body.active;
      if (!roles.has(nextRole) || typeof nextActive !== "boolean") {
        const error = new Error("Perfil ou estado da conta inválido.");
        error.status = 400;
        throw error;
      }
      if (target.email === request.user.email && (nextRole !== target.role || !nextActive)) {
        const error = new Error("Não é possível alterar o próprio perfil ou desativar a própria conta.");
        error.status = 400;
        throw error;
      }
      const wouldRemainPrivileged = users.some((candidate) => candidate.email !== target.email && isPrivileged(candidate))
        || (nextActive && (nextRole === "master" || nextRole === "admin"));
      if (isPrivileged(target) && !wouldRemainPrivileged) {
        const error = new Error("Mantenha ao menos uma conta master/admin ativa.");
        error.status = 400;
        throw error;
      }
      const updated = { ...target, role: nextRole, active: nextActive };
      await updateUser(updated);
      return updated;
    });
    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get(["/", "/index.html"], (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.sendFile(path.join(__dirname, "index.html"));
});
app.get("/styles.css", (request, response) => response.sendFile(path.join(__dirname, "styles.css")));
app.get("/app.js", (request, response) => response.sendFile(path.join(__dirname, "app.js")));

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.status) return response.status(error.status).json({ error: error.message });
  console.error("Falha na solicitação:", error.message);
  response.status(503).json({ error: "Serviço temporariamente indisponível. Verifique a configuração do servidor e da planilha." });
});

async function start() {
  await bootstrapAdmin();
  app.listen(port, () => {
    console.log(`Genética Elite disponível em http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(`Não foi possível iniciar: ${error.message}`);
  process.exitCode = 1;
});
