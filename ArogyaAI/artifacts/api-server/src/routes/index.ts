import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import authRouter from "./auth";
import hospitalsRouter from "./hospitals";
import medicinesRouter from "./medicines";
import doctorsRouter from "./doctors";
import zonesRouter from "./zones";
import alertsRouter from "./alerts";
import patientReportsRouter from "./patient-reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use("/auth", authRouter);
router.use("/hospitals", hospitalsRouter);
router.use("/medicines", medicinesRouter);
router.use("/doctors", doctorsRouter);
router.use("/zones", zonesRouter);
router.use("/alerts", alertsRouter);
router.use("/patient-reports", patientReportsRouter);

export default router;
