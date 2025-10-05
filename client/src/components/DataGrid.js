import React from 'react';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'id', headerName: 'ID', width: 220 },
  { field: 'name', headerName: 'Name', width: 180 },
  { field: 'email', headerName: 'Email', width: 250 },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 150,
    renderCell: (params) => (
      <strong>
        <button
          variant="contained"
          color="primary"
          size="small"
          style={{ marginLeft: 16 }}
          onClick={() => {
            // Handle actions
          }}
        >
          Delete
        </button>
      </strong>
    ),
  },
];

const Grid = ({ data }) => {
  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={data}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        checkboxSelection
      />
    </div>
  );
};

export default Grid;