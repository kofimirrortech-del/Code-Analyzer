import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const USERS: Record<string, { pass: string; role: string }> = {
  admin: { pass: "admin123", role: "ADMIN" },
  store_user: { pass: "store789", role: "STORE" },
  ing_user: { pass: "ing789", role: "INGREDIENT" },
  prod_user: { pass: "prod789", role: "PRODUCTION" },
  pkg_user: { pass: "pkg789", role: "PACKAGE" },
  disp_user: { pass: "disp789", role: "DISPATCH" },
};

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = USERS[(username || "").toLowerCase()];
  if (!user || user.pass !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({ sessionId, username: username.toLowerCase(), role: user.role });

  res.cookie("session_id", sessionId, { httpOnly: true, sameSite: "lax" });
  res.json({ username: username.toLowerCase(), role: user.role });
});

router.post("/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
  }
  res.clearCookie("session_id");
  res.json({ success: true });
});

router.get("/me", async (req: Request, res: Response) => {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ username: session.username, role: session.role });
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as Request & { user?: { username: string; role: string } }).user = { username: session.username, role: session.role };
  next();
}

export default router;
