import { Logger } from "tslog";
import { LOG_LEVEL } from "./defaults";

const defaultLogger = new Logger({
    name: "__default__",
    minLevel: LOG_LEVEL,
});

export const logging = (name?: string) => {
    if (!name) {
        return defaultLogger;
    }

    return defaultLogger.getChildLogger({
        name: name || "__root__",
        minLevel: LOG_LEVEL,
    });
}
