const mockDb = {
    users: {}
  };
  
  const mockFirestore = {
    collection: jest.fn((_, path) => path),
    doc: jest.fn((_, path, id) => `${path}/${id}`),
    getDoc: jest.fn(async (ref) => {
      const [collection, id] = ref.split('/');
      const data = mockDb[collection]?.[id];
      return {
        exists: () => !!data,
        data: () => data
      };
    }),
    setDoc: jest.fn(async (ref, data) => {
      const [collection, id] = ref.split('/');
      mockDb[collection] = mockDb[collection] || {};
      mockDb[collection][id] = data;
    }),
    Timestamp: {
      fromDate: jest.fn(date => ({ 
        seconds: Math.floor(date.getTime() / 1000),
        toDate: () => date
      }))
    },
    __mockDb: mockDb // For test inspection
  };
  
  export const db = mockFirestore;