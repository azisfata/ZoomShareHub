declare module 'phpass' {
  export default class PasswordHash {
    constructor(iteration_count_log2: number, portable_hashes: boolean);
    hashPassword(password: string): string;
    checkPassword(password: string, stored_hash: string): boolean;
  }
}
