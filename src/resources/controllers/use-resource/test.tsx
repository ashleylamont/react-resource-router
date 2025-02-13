import { render, act } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { defaultRegistry } from 'react-sweet-state';

import { createRouterContext } from '../../../common/utils';
import { getRouterState } from '../../../controllers/router-store';
import { DEFAULT_MATCH, DEFAULT_ROUTE } from '../../../index';
import { createResource, ResourceStore } from '../resource-store';

import { useResource } from './index';

jest.mock('../../../controllers/router-store', () => ({
  ...jest.requireActual<any>('../../../controllers/router-store'),
  getRouterState: jest.fn(),
}));

const mockType = 'some-type';
const mockKey = 'i-am-a-key';
const mockSlice = {
  data: null,
  error: null,
  loading: false,
  key: 'i-am-a-key',
  promise: Promise.resolve(),
  expiresAt: 0,
};
const mockData = 'some-data';
const getDataPromise = Promise.resolve(mockData);
const mockRoute = {
  name: '',
  path: ':page?',
  component: () => null,
};

const mockMatch = {
  params: {},
  query: {},
  isExact: false,
  path: ':page?',
  url: '',
};

const mockResource = createResource({
  type: mockType,
  getKey: () => mockKey,
  getData: () => getDataPromise,
  maxAge: 100,
});

const mockHydratableState = {
  resourceContext: {
    route: mockRoute,
    match: mockMatch,
    query: {},
  },
  resourceData: {
    [mockType]: {
      [mockKey]: mockSlice,
    },
  },
};

const MockComponent = ({ children, ...rest }: any) => {
  return children(rest);
};

const mockRouterContext = {
  route: DEFAULT_ROUTE,
  match: DEFAULT_MATCH,
  query: {},
};

describe('useResource()', () => {
  let resourceStore;
  let storeState: any;
  let actions: any;
  const spy = jest.fn();

  beforeEach(() => {
    resourceStore = defaultRegistry.getStore(ResourceStore);
    storeState = resourceStore.storeState;
    actions = resourceStore.actions;

    (getRouterState as any).mockReturnValue(mockRouterContext);

    actions.hydrate(mockHydratableState);
    jest.spyOn(global.Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    defaultRegistry.stores.clear();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return the slice and bound actions for a given resource', () => {
    render(
      <MockComponent>
        {() => {
          const resource = useResource(mockResource);

          spy(resource);

          return <h1>my test</h1>;
        }}
      </MockComponent>
    );

    expect(spy).toHaveBeenCalledWith({
      ...mockSlice,
      update: expect.any(Function),
      refresh: expect.any(Function),
      clear: expect.any(Function),
      clearAll: expect.any(Function),
    });
  });

  describe('update action', () => {
    it('should update a resource with the provided data', () => {
      const newData = 'my-better-data';
      let resourceResponse: any;
      render(
        <MockComponent>
          {() => {
            resourceResponse = useResource(mockResource);

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.update(() => newData));

      const storeData = storeState.getState();

      expect(storeData.data[mockType][mockKey]).toEqual({
        ...mockSlice,
        expiresAt: 100,
        data: newData,
        accessedAt: 0,
      });
    });

    it('should update a resource with the data set to null', () => {
      const newData = null;
      let resourceResponse: any;
      render(
        <MockComponent>
          {() => {
            resourceResponse = useResource(mockResource);

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.update(() => newData));

      const storeData = storeState.getState();

      expect(storeData.data[mockType][mockKey]).toEqual({
        ...mockSlice,
        expiresAt: 100,
        data: newData,
        accessedAt: 0,
      });
    });

    it('should call new data getter with current data', () => {
      const currentData = 'my-current-data';
      const mockGetData = jest.fn();
      let resourceResponse: any;

      render(
        <MockComponent>
          {() => {
            resourceResponse = useResource(mockResource);

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.update(() => currentData));
      act(() => resourceResponse.update(mockGetData));

      expect(mockGetData).toHaveBeenCalledWith(currentData);
    });
  });

  describe('refresh action', () => {
    it('should call actions.getResourceFromRemote', () => {
      const getResourceSpy = jest
        .spyOn(actions, 'getResourceFromRemote')
        .mockImplementation(() => {});
      let resourceResponse: any;
      render(
        <MockComponent>
          {() => {
            resourceResponse = useResource(mockResource);

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.refresh());

      expect(getResourceSpy).toHaveBeenCalledWith(
        mockResource,
        mockRouterContext,
        { prefetch: false }
      );
    });
  });

  describe('options: custom router context', () => {
    it('should retrieve data of a custom resource state', () => {
      const mockRes = createResource({
        type: mockType,
        getKey: ({ match: { params } }) => params.page || '',
        getData: () => Promise.resolve('original-data'),
      });
      let resourceResponse: any;
      const { rerender } = render(
        <MockComponent page="page1">
          {({ page }: { page: string }) => {
            resourceResponse = useResource(mockRes, {
              routerContext: createRouterContext(mockRoute, {
                params: { page },
              }),
            });

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.update(() => 'new-data'));

      expect(storeState.getState().data[mockType]['page1']).toMatchObject({
        data: 'new-data',
      });

      rerender(
        <MockComponent page="page2">
          {({ page }: { page: string }) => {
            resourceResponse = useResource(mockRes, {
              routerContext: createRouterContext(mockRoute, {
                params: { page },
              }),
            });

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );
      act(() => resourceResponse.update(() => 'new-data-2'));

      expect(storeState.getState().data[mockType]['page2']).toMatchObject({
        data: 'new-data-2',
      });
    });
  });

  describe('clear action', () => {
    it('should clear the resource', () => {
      let resourceResponse: any;
      render(
        <MockComponent>
          {() => {
            resourceResponse = useResource(mockResource);

            return <h1>my test</h1>;
          }}
        </MockComponent>
      );

      act(() => resourceResponse.clear());

      const storeData = storeState.getState();

      expect(storeData.data[mockType]?.[mockKey]).toEqual(undefined);
    });

    describe('clearAll action', () => {
      it('should clear all the resources of the given type', () => {
        const state = storeState.getState();
        storeState.setState({
          ...state,
          data: {
            [mockType]: {
              ...state.data[mockType],
              [`${mockKey}alt`]: mockSlice,
            },
          },
        });

        let resourceResponse: any;

        render(
          <MockComponent>
            {() => {
              resourceResponse = useResource(mockResource);

              return <h1>my test</h1>;
            }}
          </MockComponent>
        );

        act(() => resourceResponse.clearAll());

        const storeData = storeState.getState();

        expect(storeData.data[mockType]).toEqual(undefined);
      });
    });
  });
});
