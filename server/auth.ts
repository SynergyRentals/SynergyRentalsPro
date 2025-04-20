import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  console.log(`[Auth Debug] Hashing password`);
  const salt = randomBytes(16).toString("hex");
  console.log(`[Auth Debug] Generated salt: ${salt}, length: ${salt.length}`);
  
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashedPassword = `${buf.toString("hex")}.${salt}`;
  
  console.log(`[Auth Debug] Generated hash of length: ${hashedPassword.length}`);
  return hashedPassword;
}

async function comparePasswords(supplied: string, stored: string) {
  console.log(`[Auth Debug] Comparing passwords - stored hash length: ${stored.length}`);
  
  try {
    // Extract hash and salt from stored password
    const [hashed, salt] = stored.split(".");
    
    if (!hashed || !salt) {
      console.error(`[Auth Debug] Invalid password format - missing hash or salt`);
      return false;
    }
    
    console.log(`[Auth Debug] Hash length: ${hashed.length}, Salt length: ${salt.length}`);
    
    // Convert stored hash to buffer
    const hashedBuf = Buffer.from(hashed, "hex");
    
    // Hash the supplied password with the same salt
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Compare the hashes
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`[Auth Debug] Password comparison result: ${result}`);
    
    return result;
  } catch (error) {
    console.error(`[Auth Debug] Error comparing passwords:`, error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "synergy-rentals-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      console.log(`[Auth] Login attempt for username: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`[Auth] User not found: ${username}`);
        return done(null, false);
      }
      
      const isPasswordValid = await comparePasswords(password, user.password);
      console.log(`[Auth] Password validation result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        return done(null, false);
      } else {
        console.log(`[Auth] Login successful for: ${username}`);
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Original routes without /auth prefix
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // New routes with /auth prefix to match client expectations
  app.post("/api/auth/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
