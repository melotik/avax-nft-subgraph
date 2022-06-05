# Ava Labs Subgraph Bounty

## Marketplace(s)

This was designed to be an aggregated subgraph accross multiple exchanges; however there were 2 issues for me. 

1) 3 of the 5 top NFT exchanges on Avalance do not have a public github with their contracts, nor could I find their deployed contracts.
   - If I dug around in source code enough I may be able to locate, but that didn't seem like the best use of my time.
2) I was short on time and wanted to at least complete one of the exchanges. And that is the YetiSwap NFT marketplace: https://snowtrace.io/address/0x14390f57ccfdb45f969381e7e107acf062d3a592

## Design

The focuses on the schema are as follows:

- tracking every NFT that goes through this exchange (listed, sold, unlisted, etc.)
- Tracking volume, price, floorPrice, blockNumbers, activity, active listings

These metrics allow the user to access data that could tell them all about an NFT collection, you can see historical listings, and sales while see the latest price updates.

Since this was supposed to be aggregated across multiple exchanges I tried to make the schema as generic as possible. Each exchange should fit since I didn't use any exchange-level parameters for identifiers on the main entities. You can find a helper entity section. This allows more flexibility when adding new exchanges.


## File Structure

Abis for the contract calls/events we need to track can be found under `./abis`

`package.json` contains a number of run scripts that are useful for deploying (see the how to section)

`./src` contains the `mapping.ts` and `constants.ts` which are self explanatory

`subgraph.yaml` is the manifest that describes what event we want to watch from the exchange contract

`schema.graphql` defines the schema we will follow that can be queried in production (see sample queries)

## How to Deploy

```bash
$ yarn
$ yarn run codegen
$ yarn run build
$ yarn run deploy # Note: add your github name to the deploy script
```

## Sample Queries

Get NFT collection pricing info and current listings
```graphql
query MyQuery {
  erc721S {
    id
    name
    symbol
    floorPriceUSD
    volumeUSD
    listings(where: {isListed: true}, orderBy: amountUSD    , orderDirection: desc) {
      id
      nftId {
        owner
        tokenId
        contract
      }
      amount
    }
  }
}
```

Get NFT collection historical activity:
```graphql
query MyQuery {
  erc721S {
    id
    name
    transfers(orderDirection: asc, orderBy: timestamp) {
      id
      to
      from
      tokenId
      token {
        name
        id
        priceUSD
      }
      amount
      amountUSD
    }
  }
}
```

query endpoints: https://thegraph.com/hosted-service/subgraph/dmelotik/avax-nft-subgraph?version=pending

or

https://thegraph.com/hosted-service/subgraph/dmelotik/avax-nft-subgraph?version=current

## What we learned

Starting earlier would allow us to investigate issues more. We got carried away at talks the day before and didn't get started until the night.

## Next steps

We would like to investigate why the contracts are not easily available for the other avalanche NFT marketplaces.

## Team

Dylan Melotik (discord: dmelotik#1530)

Chris Steege (discord: steegecs#2390)

Slipper Fish (discord: slipperyfish#9458)