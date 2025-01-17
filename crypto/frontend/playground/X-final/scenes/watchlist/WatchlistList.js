import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from '@mui/material';
import {memo, useMemo} from 'react';
import {graphql, usePaginationFragment, useSubscription} from 'react-relay';

import {LoadMoreButton, NoData} from '@/components';
import {useSize} from '@/hooks';

import WatchlistListItem from './WatchlistListItem';

export default memo(function WatchlistList({fragmentRef}) {
  const {data, hasNext, loadNext, isLoadingNext} = usePaginationFragment(
    graphql`
      fragment WatchlistListFragment_query on Query
      @argumentDefinitions(
        cursor: {type: "String"}
        count: {type: "Int", defaultValue: 10}
      )
      @refetchable(queryName: "WatchlistListRefetchableQuery") {
        me {
          watchlist {
            assets(after: $cursor, first: $count)
              @connection(key: "WatchlistList_assets") {
              edges {
                node {
                  id
                  symbol
                  ...WatchlistListItemFragment_asset
                }
              }
            }
          }
        }
      }
    `,
    fragmentRef,
  );
  const assets = data.me?.watchlist?.assets?.edges;
  const symbols = assets?.map(({node}) => node.symbol) ?? [];

  useSubscription(
    useMemo(
      () => ({
        subscription: graphql`
          subscription WatchlistListSubscription($symbols: [String!]) {
            onPriceChange(symbols: $symbols) {
              ...WatchlistListItemFragment_assetprice
            }
          }
        `,
        variables: {symbols},
      }),
      [String(symbols)],
    ),
    symbols.length ? undefined : () => ({dispose() {}}),
  );

  const [tableRef, size] = useSize();
  const extended = size?.width > 400;

  return (
    <Stack px={4}>
      {assets?.length || hasNext ? (
        <Table ref={tableRef} size="medium">
          <TableBody>
            {assets.map(({node}) => (
              <WatchlistListItem
                key={node.id}
                fragmentRef={node}
                extended={extended}
              />
            ))}
          </TableBody>
          {hasNext && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <LoadMoreButton busy={isLoadingNext} onClick={loadNext} />
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      ) : (
        <NoData message="Your watchlist is empty." />
      )}
    </Stack>
  );
});
