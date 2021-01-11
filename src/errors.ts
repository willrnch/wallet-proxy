
export class IndexOutOfBoundsError extends RangeError {
  public readonly name = 'IndexOutOfBoundsError ';

  public readonly code = 'INDEX_OUT_OF_BOUNDS';

  constructor(public readonly min: number, public readonly max: number) {
    super();
  }

  get message(): string {
    return `Index must be between ${this.min} and ${this.max}`;
  }
}
