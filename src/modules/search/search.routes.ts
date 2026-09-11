import { Router, Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { SearchService } from "./search.service";
import { auth } from "@/middlewares/auth";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  search = this.catchAsync(async (req: Request, res: Response) => {
    const result = await SearchService.search(
      String(req.query.q || ""),
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Search results.",
      data: result,
    });
  });
}

const controller = new Controller();
const router = Router();
router.use(auth);
router.get("/", controller.search);

export const SearchRoutes = router;
