import { createFileRoute } from "@tanstack/react-router";
import { CatalogManager } from "./vendor.products";

export const Route = createFileRoute("/vendor/services")({ component: () => <CatalogManager kind="service" /> });
