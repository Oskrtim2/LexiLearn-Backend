export const OCR_PROVIDER = Symbol('OCR_PROVIDER');

export interface OcrProviderInput {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly filename: string;
}

export interface OcrProviderResult {
  readonly text: string;
  readonly confidence: number | null;
}

export interface OcrProvider {
  readonly name: string;
  extract(input: OcrProviderInput): Promise<OcrProviderResult>;
}
