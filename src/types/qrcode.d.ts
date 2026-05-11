declare module 'qrcode' {
  export function toString(
    text: string,
    options?: {
      type?: string;
      small?: boolean;
    },
  ): Promise<string>;

  const QRCode: {
    toString: typeof toString;
  };

  export default QRCode;
}
