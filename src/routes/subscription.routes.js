import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/c").get(getSubscribedChannels);
router.route("/c/:channelId").post(toggleSubscription);
router.route("/u/subscribers").get(getUserChannelSubscribers);

export default router;
