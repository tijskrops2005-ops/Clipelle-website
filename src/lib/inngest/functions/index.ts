import { adWorkflow } from "./adWorkflow";
import { helloFunction } from "./hello";
import { translateWorkflow } from "./translateWorkflow";
import { deliverWebhook } from "./deliverWebhook";
import { autoReload } from "./autoReload";
import { annualCredits } from "./annualCredits";
import { qualityReport } from "./qualityReport";

/** Every function the app registers with Inngest. Add new workflows here. */
export const functions = [helloFunction, adWorkflow, translateWorkflow, deliverWebhook, autoReload, annualCredits, qualityReport];
