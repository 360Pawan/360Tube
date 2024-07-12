import { Router } from "express";

import { verifyJWT } from "@/middlewares/auth.middleware";
import { upload } from "@/middlewares/multer.middleware";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  updateVideoThumbnail,
} from "@/controllers/video.controller";

const router = Router();
router.use(verifyJWT);

router
  .route("/")
  .get(getAllVideos)
  .post(
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );
router
  .route("/:videoId")
  .get(getVideoById)
  .delete(deleteVideo)
  .patch(updateVideo);
router
  .route("/thumbnail/:videoId")
  .patch(upload.single("thumbnail"), updateVideoThumbnail);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
