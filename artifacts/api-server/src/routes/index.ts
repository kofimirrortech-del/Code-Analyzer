import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import storeRouter from "./store.js";
import ingredientsRouter from "./ingredients.js";
import productionRouter from "./production.js";
import packagesRouter from "./packages.js";
import dispatchRouter from "./dispatch.js";
import dashboardRouter from "./dashboard.js";
import historyRouter from "./history.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/store", storeRouter);
router.use("/ingredients", ingredientsRouter);
router.use("/production", productionRouter);
router.use("/packages", packagesRouter);
router.use("/dispatch", dispatchRouter);
router.use("/dashboard", dashboardRouter);
router.use("/history", historyRouter);

export default router;
