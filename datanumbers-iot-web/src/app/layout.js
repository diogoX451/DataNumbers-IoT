'use client'
// import node module libraries
import { useState } from 'react';

// import theme style scss file
import '@/styles/theme.scss';



export default function DashboardLayout({ children }) {
	
	return (
		<div>
      {children}
    </div>
	)
}
