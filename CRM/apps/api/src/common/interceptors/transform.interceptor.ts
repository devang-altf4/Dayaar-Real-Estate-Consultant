import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // If result is already structured with success/data, preserve it
        if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
          return {
            ...result,
            timestamp: new Date().toISOString(),
          };
        }

        // If result has pagination meta
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return {
            success: true,
            data: result.data,
            meta: result.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
