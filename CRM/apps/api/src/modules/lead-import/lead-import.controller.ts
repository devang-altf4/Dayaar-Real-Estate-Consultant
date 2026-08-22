import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { LeadImportService, ImportOptions } from './lead-import.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  Role,
  IAuthUser,
  BulkImportPayloadDto,
  BulkImportPayloadSchema,
  TextImportPayloadDto,
  TextImportPayloadSchema,
  GoogleSheetImportPayloadDto,
  GoogleSheetImportPayloadSchema,
} from '@dayaar/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls'];

function parseOptionsFromMultipartBody(body: Record<string, any>): ImportOptions {
  const duplicateAction = ['SKIP', 'UPDATE', 'REPLACE'].includes(body.duplicateAction)
    ? body.duplicateAction
    : 'SKIP';
  const autoAssignStrategy = ['NONE', 'ROUND_ROBIN'].includes(body.autoAssignStrategy)
    ? body.autoAssignStrategy
    : 'ROUND_ROBIN';
  const assignScope = body.assignScope === 'ORGANIZATION' ? 'ORGANIZATION' : 'TEAM';
  let targetEmployeeIds: string[] | undefined;
  if (typeof body.targetEmployeeIds === 'string' && body.targetEmployeeIds.trim()) {
    targetEmployeeIds = body.targetEmployeeIds
      .split(',')
      .map((id: string) => id.trim())
      .filter(Boolean);
  }
  return { duplicateAction, autoAssignStrategy, assignScope, targetEmployeeIds };
}

@Controller('leads/import')
export class LeadImportController {
  constructor(private readonly importService: LeadImportService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post()
  async importLeads(
    @Body(new ZodValidationPipe(BulkImportPayloadSchema)) dto: BulkImportPayloadDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.importService.processBulkImport(dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('text')
  async importText(
    @Body(new ZodValidationPipe(TextImportPayloadSchema)) dto: TextImportPayloadDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.importService.processTextImport(dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('google-sheet')
  async importGoogleSheet(
    @Body(new ZodValidationPipe(GoogleSheetImportPayloadSchema)) dto: GoogleSheetImportPayloadDto,
    @CurrentUser() user: IAuthUser,
  ) {
    return this.importService.processGoogleSheetImport(dto, user.organizationId, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_IMPORT_FILE_BYTES },
    }),
  )
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
    @CurrentUser() user: IAuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Attach a .xlsx, .xls, .csv or .tsv/.txt file.');
    }
    const extension = file.originalname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `Unsupported file type "${extension || 'unknown'}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
    const options = parseOptionsFromMultipartBody(body);
    return this.importService.processFileImport(file.buffer, options, user.organizationId, user);
  }
}
