export { readAcroForm } from './acroform';
export { detectVersion, detectVersionFromText } from './versionDetector';
export { mapAcroformToRawTrec20, toRawTrec20 } from './trec20';
export type { RawTrec20, VersionDetectionResult } from './types';

// Export for testing only (marked as internal)
export { parseRawFromOcrText } from './ocr';