import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { IAuthUser, MongoIdSchema, RecordingExportDto, RecordingExportSchema, Role } from '@dayaar/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RecordingsService } from './recordings.service';

@Roles(Role.ADMIN)
@Controller('admin/recordings')
export class RecordingsController {
  constructor(private readonly recordings: RecordingsService) {}

  @Post('export')
  createExport(
    @CurrentUser() user: IAuthUser,
    @Body(new ZodValidationPipe(RecordingExportSchema)) body: RecordingExportDto,
  ) {
    return this.recordings.createExport(user, new Date(body.from), new Date(body.to));
  }

  @Get('export/:id')
  getExport(
    @CurrentUser() user: IAuthUser,
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
  ) {
    return this.recordings.getExport(user, id);
  }

  @Get('export/:id/download')
  async download(
    @CurrentUser() user: IAuthUser,
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.recordings.streamExport(user, id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(buffer);
  }

  @Post('export/:id/confirm-download')
  confirmDownload(
    @CurrentUser() user: IAuthUser,
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
  ) {
    return this.recordings.confirmDownload(user, id);
  }

  @Post('export/:id/purge')
  purge(
    @CurrentUser() user: IAuthUser,
    @Param('id', new ZodValidationPipe(MongoIdSchema)) id: string,
  ) {
    return this.recordings.purgeExportedRange(user, id);
  }
}
