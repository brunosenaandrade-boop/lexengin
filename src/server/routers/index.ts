/**
 * Main tRPC Router
 * Combines all routers into a single app router
 */

import { createTRPCRouter } from '../trpc';
import { calculadorasRouter } from './calculadoras';

/**
 * Main application router
 */
export const appRouter = createTRPCRouter({
  calculadoras: calculadorasRouter,
  // Add more routers here as they are implemented:
  // processos: processosRouter,
  // clientes: clientesRouter,
  // financeiro: financeiroRouter,
  // documentos: documentosRouter,
  // agenda: agendaRouter,
  // ai: aiRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
