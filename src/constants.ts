// Avalanche chain constants
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

///////////////////
//// Addresses ////
///////////////////

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const AVAX_NAME = "Avalanche";
export const AVAX_SYMBOL = "AVAX";

/////////////////
//// Numbers ////
/////////////////

export const INT_ZERO = 0;
export const INT_ONE = 1;

export const BIGINT_ZERO = BigInt.fromI32(0);
export const BIGINT_ONE = BigInt.fromI32(1);
export const BIGINT_TEN = BigInt.fromI32(10);

export const BIGDECIMAL_ZERO = BigDecimal.fromBigInt(BIGINT_ZERO);
export const BIGDECIMAL_ONE = BigDecimal.fromBigInt(BIGINT_ONE);
export const BIGDECIMAL_TEN = BigDecimal.fromBigInt(BIGINT_TEN);

////////////////////////
//// Util Functions ////
////////////////////////

// convert decimals
export function exponentToBigDecimal(decimals: i32): BigDecimal {
  let bd = BIGDECIMAL_ONE;
  for (let i = INT_ZERO; i < (decimals as i32); i = i + INT_ONE) {
    bd = bd.times(BIGDECIMAL_TEN);
  }
  return bd;
}
