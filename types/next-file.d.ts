declare module "next-file" {
    export function saveFiles(
      req: Request,
      options?: {
        directory?: string;
        maxFileSize?: number;
        allowedTypes?: string[];
      }
    ): Promise<{ filePath: string; fileName: string }[]>;
  }
  