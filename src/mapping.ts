// map events from YetiSwap NFT Marketplace

import {
  NewCollectionAdded,
  NewTokenAdded,
  TokenOnSale,
  TokenRemovedFromSale,
  TokenSold,
} from "../generated/YetiSwapNFTMarketplace/YetiSwap";
import { ERC721 as ERC721Contract } from "../generated/YetiSwapNFTMarketplace/ERC721";
import { ERC20 } from "../generated/YetiSwapNFTMarketplace/ERC20";
import { ERC721, Listing, NFT, Token, Transfer } from "../generated/schema";
import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import {
  AVAX_DECIMALS,
  AVAX_NAME,
  AVAX_SYMBOL,
  BIGDECIMAL_ZERO,
  BIGINT_ONE,
  BIGINT_ZERO,
  exponentToBigDecimal,
  INT_ZERO,
  ZERO_ADDRESS,
} from "./constants";

//////////////////
//// Handlers ////
//////////////////

export function handleTokenOnSale(event: TokenOnSale): void {
  // create listing entity to track potential sale
  let listing = new Listing(event.params.saleIndex.toString());
  listing.isListed = true;
  listing.seller = event.params.seller.toHexString();
  listing.contract = event.params.nftContract.toHexString();
  listing.tokenId = event.params.nftId.toI32();
  listing.nftId = listing.contract + "-" + listing.tokenId.toString();
  listing.token = event.params.saleToken.toHexString();
  listing.amount = event.params.price;
  listing.blockNumber = event.block.number;
  listing.timestamp = event.block.timestamp;

  // update asset price
  let token = Token.load(listing.token)!;
  let assetPrice = getAssetPrice(token, event.block.number);
  listing.amountUSD = listing.amount
    .toBigDecimal()
    .div(exponentToBigDecimal(token.decimals))
    .times(assetPrice);
  listing.save();

  // get or create NFT
  let nft = getOrCreateNFT(
    listing.contract,
    listing.nftId,
    event.block.number,
    true
  );
  nft.listingPriceUSD = listing.amountUSD;
  nft.save();

  // update NFT floor price
  let erc721 = getOrCreateERC721(listing.contract, event.block.number);
  erc721.floorPriceUSD = calculateFloorPriceUSD(
    erc721._listings,
    event.block.number
  );
  erc721.save();
}

export function handleTokenRemovedFromSale(event: TokenRemovedFromSale): void {
  let listing = Listing.load(event.params.saleIndex.toString());
  if (!listing) {
    log.warning("[handleTokenRemovedFromSale] listing not found: {}", [event.params.saleIndex.toString()]);
    return;
}
  listing.isListed = false;
  listing.save();

  // update NFT
  let nft = getOrCreateNFT(
    listing.contract,
    listing.nftId,
    event.block.number,
    false
  );
  nft.listingPriceUSD = BIGDECIMAL_ZERO;
  nft.save();

  // check if new floor price needs to be calculated
  let erc721 = getOrCreateERC721(listing.contract, event.block.number);
  erc721.floorPriceUSD = calculateFloorPriceUSD(
    erc721._listings,
    event.block.number
  );
  erc721.save();
}

export function handleTokenSold(event: TokenSold): void {
  let listing = Listing.load(event.params.saleIndex.toString());
  if (!listing) {
    log.warning("[handleTokenSold] Listing not found: {}", [event.params.saleIndex.toString()])  
    return;
  }
  listing.isListed = false;
  listing.save();

  // create transfer entitiy
  let id =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let transfer = new Transfer(id);

  transfer.hash = event.transaction.hash.toHexString();
  transfer.logIndex = event.logIndex.toI32();
  transfer.contract = listing.contract;
  transfer.to = event.params.buyer.toHexString();
  transfer.from = listing.seller;
  transfer.token = listing.token;
  transfer.amount = listing.amount;
  transfer.tokenId = listing.tokenId;
  transfer.nftId = listing.nftId;
  transfer.blockNumber = event.block.number;
  transfer.timestamp = event.block.timestamp;

  // recalculate listing price
  let token = Token.load(listing.token)!;
  let assetPrice = getAssetPrice(token, event.block.number);
  transfer.amountUSD = listing.amount
    .toBigDecimal()
    .div(exponentToBigDecimal(token.decimals))
    .times(assetPrice);

  // update floorPrice
  let erc721 = getOrCreateERC721(listing.contract, event.block.number);
  erc721.floorPriceUSD = calculateFloorPriceUSD(
    erc721._listings,
    event.block.number
  );

  // update other erc721 fields
  erc721.saleCount = erc721.saleCount.plus(BIGINT_ONE);
  erc721.volumeUSD = erc721.volumeUSD.plus(transfer.amountUSD);
  erc721.save();

  // update NFT fields
  let nft = getOrCreateNFT(
    listing.contract,
    listing.nftId,
    event.block.number,
    false
  );
  nft.owner = event.params.buyer.toHexString();
  nft.listingPriceUSD = BIGDECIMAL_ZERO;
  nft.lastSalePriceUSD = transfer.amountUSD;
  nft.save();
}

export function handleNewCollectionAdded(event: NewCollectionAdded): void {
  getOrCreateERC721(
    event.params.collectionContract.toHexString(),
    event.block.number
  );
}

// TODO: setup avalanche tokn
export function handleNewTokenAdded(event: NewTokenAdded): void {
  // create new token to track for pricing
  let token = Token.load(event.params.tokenContract.toHexString());

  if (!token) {
    token = new Token(event.params.tokenContract.toHexString());

    if (token.id == ZERO_ADDRESS) {
      token.name = AVAX_NAME;
      token.symbol = AVAX_SYMBOL;
      token.decimals = AVAX_DECIMALS;
    } else {
      // load ERC20 for data points
      let erc20Contract = ERC20.bind(event.params.tokenContract);

      let tryName = erc20Contract.try_name();
      let trySymbol = erc20Contract.try_symbol();
      let tryDecimals = erc20Contract.try_decimals();

      token.name = tryName.reverted ? "UNKNOWN" : tryName.value;
      token.symbol = trySymbol.reverted ? "UNKNOWN" : trySymbol.value;
      token.decimals = tryDecimals.reverted ? -1 : tryDecimals.value;
    }

    token.priceUSD = getAssetPrice(token, event.block.number);
    token.blockNumber = event.block.number;
    token.save();
  }
}

/////////////////
//// Helpers ////
/////////////////

function getOrCreateERC721(contract: string, blockNumber: BigInt): ERC721 {
  let erc721 = ERC721.load(contract);

  if (!erc721) {
    erc721 = new ERC721(contract);

    // load erc721 to get data
    let erc721Contract = ERC721Contract.bind(Address.fromString(contract));

    let trySymbol = erc721Contract.try_symbol();
    let tryName = erc721Contract.try_name();
    let tryTotalSupply = erc721Contract.try_totalSupply();

    erc721.symbol = trySymbol.reverted ? "UNKNOWN" : trySymbol.value;
    erc721.name = tryName.reverted ? "UNKNOWN" : tryName.value;
    erc721.totalSupply = tryTotalSupply.reverted
      ? BIGINT_ZERO
      : tryTotalSupply.value;

    erc721.uniqueOwners = BIGINT_ZERO;
    erc721.floorPriceUSD = BIGDECIMAL_ZERO;
    erc721.volumeUSD = BIGDECIMAL_ZERO;
    erc721.saleCount = BIGINT_ZERO;
    erc721.blockNumber = blockNumber;
    erc721._nfts = [];
    erc721._listings = [];

    erc721.save();
  }

  return erc721;
}

function getOrCreateNFT(
  contract: string,
  tokenId: string,
  blockNumber: BigInt,
  isListed: boolean
): NFT {
  let nftId = contract + "-" + tokenId;
  let nft = NFT.load(nftId);

  if (!nft) {
    nft = new NFT(nftId);
    nft.contract = contract;
    nft.tokenId = BigInt.fromString(tokenId).toI32();

    // load ERC721 for data points
    let nftContract = ERC721Contract.bind(Address.fromString(contract));
    let tryOwner = nftContract.try_ownerOf(
      BigInt.fromString(tokenId)
    );
    nft.owner = tryOwner.reverted ? ZERO_ADDRESS : tryOwner.value.toHexString();

    nft.listingPriceUSD = BIGDECIMAL_ZERO;
    nft.lastSalePriceUSD = BIGDECIMAL_ZERO;
    nft.transferCount = INT_ZERO;
    nft.blockNumber = blockNumber;
  }

  nft.isListed = isListed;
  nft.save();
  return nft;
}

function calculateFloorPriceUSD(
  listings: string[],
  blockNumber: BigInt
): BigDecimal {
  let floorPriceUSD = BIGDECIMAL_ZERO;
  for (let i = 0; listings.length; i++) {
    let _listing = Listing.load(listings[i])!;
    // update price
    let token = Token.load(_listing.token)!;
    let assetPrice = getAssetPrice(token, blockNumber);
    _listing.amountUSD = _listing.amount
      .toBigDecimal()
      .div(exponentToBigDecimal(token.decimals))
      .times(assetPrice);
    _listing.save();
    if (_listing.isListed && _listing.amountUSD.lt(floorPriceUSD)) {
      floorPriceUSD = _listing.amountUSD;
    }
  }
  return floorPriceUSD;
}

function getAssetPrice(token: Token, blockNumber: BigInt): BigDecimal {
  // TODO do something with blockNumber
  return BIGDECIMAL_ZERO;
}
