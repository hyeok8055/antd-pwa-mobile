import { useEffect } from "react";
import { Chart } from "@antv/g2";

const G2BarChart = ({ data }) => {
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Initialize chart instance
    const chart = new Chart({
      container: "container",
      autoFit: true,
      height: 100,
    });

    // Declare visualization
    chart
      .interval()
      .data(data)
      .encode("x", "date")
      .encode("y", "섭취칼로리")
      .axis("y", false)
      .axis("x", { title: null })
      .style("fill", "#5FDD9D");

    // Render visualization
    chart.render();

    // Cleanup on unmount
    return () => {
      chart.destroy();
    };
  }, [data]);

  return <div id="container" style={{ width: "100%", height: "100px" }}></div>;
};

export default G2BarChart; 