import { getPageOptionsFromUrl } from '../../utils';

import {
  PAGINATION_REQUEST,
  PAGINATION_SUCCESS,
  PAGINATION_FAILURE,
  SORT_REQUEST,
  SORT_SUCCESS,
  SORT_FAILURE,
  CLEAR_TABLE,
} from '../constants/table';

const paginationRequest = (tableId, page, pageSize) => ({
  type: PAGINATION_REQUEST,
  payload: {
    tableId,
    page,
    pageSize,
  },
});

const paginationSuccess = (tableId, data, ordering, page, pageSize) => ({
  type: PAGINATION_SUCCESS,
  payload: {
    tableId,
    data,
    ordering,
    page,
    pageSize,
  },
});
const paginationFailure = (tableId, error) => ({
  type: PAGINATION_FAILURE,
  payload: {
    tableId,
    error,
  },
});

const sortRequest = (tableId, ordering) => ({
  type: SORT_REQUEST,
  payload: {
    tableId,
    ordering, // ordering passed for tracking purposes by beacon in data/store.js
  },
});

const sortSuccess = (tableId, ordering, data) => ({
  type: SORT_SUCCESS,
  payload: {
    tableId,
    ordering,
    data,
  },
});
const sortFailure = (tableId, error) => ({
  type: SORT_FAILURE,
  payload: {
    tableId,
    error,
  },
});

const paginateTable = (tableId, fetchMethod, pageNumber) => (
  (dispatch) => {
    const options = getPageOptionsFromUrl();
    if (pageNumber) {
      options.page = pageNumber;
    }
    dispatch(paginationRequest(tableId, options.page, options.page_size));
    return fetchMethod(options).then((response) => {
      dispatch(paginationSuccess(
        tableId, response.data, options.ordering,
        options.page, options.page_size,
      ));
    }).catch((error) => {
      // This endpoint returns a 404 if no data exists,
      // so we convert it to an empty response here.
      if (error.response && error.response.status === 404) {
        dispatch(paginationSuccess(
          tableId, { results: [] }, options.ordering,
          options.page, options.page_size,
        ));
        return;
      }
      dispatch(paginationFailure(tableId, error));
    });
  }
);

const sortBy = (dataToSort, orderField) => {
  const isFloatValue = value => !Number.isNaN(value) && !Number.isNaN(parseFloat(value));
  const sortByOptions = (value1, value2) => {
    let a = value1[orderField] || '';
    let b = value2[orderField] || '';
    if (typeof a === 'string' && typeof b === 'string') {
      // if both are dates
      if (!Number.isNaN(Date.parse(a)) && !Number.isNaN(Date.parse(b))) {
        a = new Date(a).getTime();
        b = new Date(b).getTime();
        return a - b;
      }
      if (isFloatValue(a) && isFloatValue(b)) {
        return parseFloat(a) - parseFloat(b);
      }
      // if neither can be parsed as a date or float
      return a.localeCompare(b);
    }
    return a - b;
  };
  return dataToSort.sort(sortByOptions);
};

const sortTable = (tableId, fetchMethod, ordering) => (
  (dispatch, getState) => {
    const tableState = getState().table[tableId];
    const options = {
      ...getPageOptionsFromUrl(),
      ordering,
    };
    dispatch(sortRequest(tableId, ordering));

    // If we can sort client-side because we have all of the data, do that
    if (tableState.data && tableState.data.num_pages === 1) {
      const isDesc = ordering.startsWith('-');
      const orderField = isDesc ? ordering.substring(1) : ordering;
      const result = sortBy(tableState.data.results, orderField);

      return dispatch(sortSuccess(tableId, ordering, {
        ...tableState.data,
        results: isDesc ? result.reverse() : result,
      }));
    }

    return fetchMethod(options).then((response) => {
      dispatch(sortSuccess(tableId, ordering, response.data));
    }).catch((error) => {
      dispatch(sortFailure(tableId, error));
    });
  }
);

const clearTable = tableId => dispatch => (dispatch({
  type: CLEAR_TABLE,
  payload: {
    tableId,
  },
}));

export {
  paginateTable,
  sortTable,
  clearTable,
};