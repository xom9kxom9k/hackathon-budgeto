export class RegisterVaultKeyCommand {
  constructor(
    public readonly userId: string,
    public readonly publicKey: string,
    public readonly encryptedPrivateKey: Record<string, string>,
    public readonly keyVersion: number,
  ) {}
}
