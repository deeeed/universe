import { Logger } from "../types/logger.types";
import { ServiceOptions } from "../types/service.types";

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(params: ServiceOptions) {
    this.logger = params.logger;
  }
}
