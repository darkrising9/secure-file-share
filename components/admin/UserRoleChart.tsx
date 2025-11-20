// File Path: components/admin/UserRoleChart.tsx

"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts" // Comes from the 'recharts' package

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Define the structure of the data the chart expects
interface ChartDataPoint {
    role: string;
    count: number;
    fill: string;
}

// Define the type for the props this component will receive
interface UserRoleChartProps {
    // We'll pass the 'users' array fetched in the dashboard page
    data: Array<{
        id: string | number;
        role: string;
        // Include other fields if needed for more complex charts
    }>;
}

export function UserRoleChart({ data }: UserRoleChartProps) {
    // Transform the raw user data into the format needed for the pie chart
    const chartData = React.useMemo(() => {
        const roleCounts: { [key: string]: number } = {};
        // Count occurrences of each role
        for (const user of data) {
            roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
        }
        // Map the counts to the chart data structure with colors
        return Object.entries(roleCounts).map(([role, count], index) => ({
            role: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize role name
            count: count,
            // Assign colors from a predefined list
            fill: `hsl(var(--chart-${index + 1}))`,
        }));
    }, [data]);

    // Define the chart configuration
    const chartConfig = {
        count: {
            label: "Users",
        },
        // Dynamically create config entries for each role
        ...Object.fromEntries(chartData.map(d => [d.role, { label: d.role, color: d.fill }])),
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>User Role Distribution</CardTitle>
                <CardDescription>Breakdown of all user roles in the system</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="role"
                            innerRadius={60}
                            strokeWidth={5}
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}