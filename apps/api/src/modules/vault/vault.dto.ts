import { IsBase64, IsInt, IsObject, IsString, Min } from 'class-validator';

export class RegisterVaultKeyDto {
  @IsBase64()
  publicKey!: string;

  @IsObject()
  encryptedPrivateKey!: Record<string, string>;

  @IsInt()
  @Min(1)
  keyVersion!: number;
}

export class VaultProofDto {
  @IsInt()
  @Min(1)
  sourceRow!: number;

  @IsString()
  fingerprint!: string;

  @IsString()
  payloadHash!: string;

  @IsBase64()
  ciphertext!: string;

  @IsBase64()
  iv!: string;

  @IsBase64()
  authTag!: string;

  @IsBase64()
  signature!: string;

  @IsString()
  publicKeyId!: string;

  @IsInt()
  @Min(1)
  keyVersion!: number;
}
