import { useEffect } from "react";
import { Chart } from "@antv/g2";

const CalorieOverChart = ({ data }) => {
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Initialize chart instance
    const chart = new Chart({
      container: "calorieOverChart",
      autoFit: true,
      height: 100,
    });

    // Declare visualization
    chart
      .interval()
      .data(data)
      .encode("x", "date")
      .encode("y", "칼로리초과")
      .axis("y", false)
      .axis("x", { title: null })
      .style("fill", "#da6662");

    // Render visualization
    chart.render();

    // Cleanup on unmount
    return () => {
      chart.destroy();
    };
  }, [data]);

  return (
    <div id="calorieOverChart" style={{ width: "100%", height: "100px" }}></div>
  );
};

export default CalorieOverChart; 