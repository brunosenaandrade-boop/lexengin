/**
 * tRPC Client Configuration
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers';

/**
 * tRPC React client
 */
export const trpc = createTRPCReact<AppRouter>();
