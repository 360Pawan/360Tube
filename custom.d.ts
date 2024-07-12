import { Request } from "express";

import { IUser } from "@/models/user.model";

declare module "express" {
  interface Request {
    user?: IUser;
    files?: {
      avatar?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
      videoFile?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    };
  }
}
