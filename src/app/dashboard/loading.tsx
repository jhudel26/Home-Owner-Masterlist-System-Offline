import React from 'react';

export default function DashboardLoading() {
  return (
    <div className='space-y-6 animate-pulse'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60'>
        <div className='space-y-2'>
          <div className='h-7 w-48 bg-slate-200 rounded-lg' />
          <div className='h-4 w-72 bg-slate-100 rounded-md' />
        </div>
        <div className='flex items-center gap-3'>
          <div className='h-9 w-28 bg-slate-200 rounded-xl' />
          <div className='h-9 w-32 bg-slate-200 rounded-xl' />
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='h-28 rounded-2xl bg-white border border-slate-200/80 p-5 space-y-3 shadow-xs'
          >
            <div className='flex items-center justify-between'>
              <div className='h-3 w-20 bg-slate-200 rounded' />
              <div className='h-8 w-8 bg-slate-100 rounded-xl' />
            </div>
            <div className='h-6 w-16 bg-slate-300 rounded' />
          </div>
        ))}
      </div>

      <div className='rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-xs'>
        <div className='h-5 w-40 bg-slate-200 rounded' />
        <div className='space-y-2'>
          <div className='h-10 w-full bg-slate-100 rounded-lg' />
          <div className='h-10 w-full bg-slate-100 rounded-lg' />
          <div className='h-10 w-full bg-slate-100 rounded-lg' />
        </div>
      </div>
    </div>
  );
}
