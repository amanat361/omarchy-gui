export class FileOperations {
  static async readFile(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      return await file.text();
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await Bun.write(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const file = Bun.file(filePath);
      return await file.exists();
    } catch {
      return false;
    }
  }

  static async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    const content = await this.readFile(filePath);
    await this.writeFile(backupPath, content);
    return backupPath;
  }
}