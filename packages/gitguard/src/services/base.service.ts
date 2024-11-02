import { Logger } from "../types/logger.types.js";
import { ServiceOptions } from "../types/service.types.js";

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(params: ServiceOptions) {
    this.logger = params.logger;
  }
}
