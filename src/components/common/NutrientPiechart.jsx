import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";

export default function NutrientPiechart() {
  return (
    <PieChart
      margin={{ top: 0, bottom: 0, left: 0, right: 60 }}
      series={[
        {
          data: [
            { id: 0, value: 20, label: "탄수화물" },
            { id: 1, value: 15, label: "단백질" },
            { id: 2, value: 10, label: "지방" },
          ],
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