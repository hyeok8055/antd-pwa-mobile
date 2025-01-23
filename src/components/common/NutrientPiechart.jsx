import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";

export default function NutrientPiechart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <PieChart
      margin={{ top: 0, bottom: 0, left: 0, right: 60 }}
      series={[
        {
          data: data.map((item, index) => ({
            id: index,
            value: item.value,
            label: item.type,
          })),
          innerRadius: 0,
          paddingAngle: 1,
          cornerRadius: 3,
        },
      ]}
      width={170}
      height={100}
      slotProps={{
        legend: {
          labelStyle: {
            fontSize: 11,
            fill: "black",
          },
          direction: "column",
          position: { vertical: "middle", horizontal: "right" },
          padding: -3,
          itemMarkWidth: 5,
          itemMarkHeight: 5,
          markGap: 3,
        },
      }}
    />
  );
} 