// map events from YetiSwap NFT Marketplace

import {
  NewCollectionAdded,
  NewTokenAdded,
  TokenOnSale,
  TokenRemovedFromSale,
  TokenSold,
} from "../generated/YetiSwapNFTMarketplace/YetiSwap";

export function handleTokenOnSale(event: TokenOnSale): void {}

export function handleTokenRemovedFromSale(event: TokenRemovedFromSale): void {}

export function handleTokenSold(event: TokenSold): void {}

export function handleNewCollectionAdded(event: NewCollectionAdded): void {}

export function handleNewTokenAdded(event: NewTokenAdded): void {}
