class RpcError {
  public readonly code: number;

  public readonly message: string;

  constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }

  public toJSON(): object {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export default RpcError;
