import { useEffect } from "react";
import { Chart } from "@antv/g2";

const G2BarChart = () => {
  useEffect(() => {
    // Prepare data
    const data = [
      { genre: "9일", 섭취량: 275 },
      { genre: "10일", 섭취량: 115 },
      { genre: "11일", 섭취량: 120 },
      { genre: "12일", 섭취량: 350 },
      { genre: "13일", 섭취량: 150 },
      { genre: "14일", 섭취량: 350 },
      { genre: "15일", 섭취량: 150 },
    ];

    // Initialize chart instance
    const chart = new Chart({
      container: "container", // Match the div id
      autoFit: true,
      height: 100,
    });

    // Declare visualization
    chart
      .interval() // Create an Interval tag
      .data(data) // Bind data
      .encode("x", "genre") // Encode x channel
      .encode("y", "섭취량") // Encode y channel
      .axis("y", false) // y축 숨기기
      .axis("x", { title: null }) // x축 레이블 숨기기
      .style("fill", "#5FDD9D");
    // Render visualization
    chart.render();

    // Cleanup on unmount
    return () => {
      chart.destroy();
    };
  }, []);

  return <div id="container" style={{ width: "100%", height: "100px" }}></div>;
};

export default G2BarChart; 