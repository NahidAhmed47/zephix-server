import { NextFunction, Request, RequestHandler, Response } from "express";
import { serialize } from "./serialize";

type IApiResponse<T> = {
  statusCode: number;
  success: boolean | string;
  message?: string | null;
  data?: T | null;
};

class BaseController {
  public model;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(model: any = "") {
    this.model = model;
  }
  catchAsync =
    (fn: RequestHandler) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };

  sendResponse<T>(res: Response, data: IApiResponse<T>): void {
    const responseData: IApiResponse<T> = {
      statusCode: data.statusCode,
      success: data.success,
      message: data.message || null,
      data:
        data.data === undefined || data.data === null
          ? null
          : (serialize(data.data) as T),
    };

    res.status(data.statusCode).json(responseData);
  }
}

export default BaseController;
