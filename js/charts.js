/**
 * PLN Pro-Track - Interactive Charts (Chart.js)
 */

class ProTrackCharts {
  constructor() {
    this.statusChart = null;
    this.typeChart = null;
    this.uipChart = null;
    this.portfolioSCurveChart = null;
    this.detailSCurveChart = null;
  }

  // Format currency helper
  formatMilyar(val) {
    return `Rp ${(val / 1000000000).toFixed(1)} M`;
  }

  initDashboardCharts(projects) {
    this.renderStatusChart(projects);
    this.renderTypeChart(projects);
    this.renderUIPChart(projects);
    this.renderPortfolioSCurve(projects);
  }

  renderStatusChart(projects) {
    const ctx = document.getElementById("statusChart");
    if (!ctx) return;

    if (this.statusChart) this.statusChart.destroy();

    const counts = {
      "In Progress": 0,
      "Critical": 0,
      "Testing": 0,
      "COD / Energized": 0,
      "Planning": 0
    };

    projects.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
      else counts["In Progress"]++;
    });

    this.statusChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["In Progress", "Kritis / Terlambat", "Testing & Comm.", "COD / Energized", "Planning"],
        datasets: [{
          data: [
            counts["In Progress"],
            counts["Critical"],
            counts["Testing"],
            counts["COD / Energized"],
            counts["Planning"]
          ],
          backgroundColor: [
            "#00A3E0", // PLN Cyan
            "#EF4444", // Red Critical
            "#F59E0B", // Amber Testing
            "#10B981", // Green COD
            "#64748B"  // Slate Planning
          ],
          borderWidth: 2,
          borderColor: "#FFFFFF"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} Proyek (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  renderTypeChart(projects) {
    const ctx = document.getElementById("typeChart");
    if (!ctx) return;

    if (this.typeChart) this.typeChart.destroy();

    const typeMap = {};
    projects.forEach(p => {
      typeMap[p.tipe] = (typeMap[p.tipe] || 0) + 1;
    });

    const labels = Object.keys(typeMap);
    const data = Object.values(typeMap);

    this.typeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels.map(l => l.replace(" (Transmisi)", "").replace(" (Ekstra Tinggi)", "")),
        datasets: [{
          label: "Jumlah Proyek",
          data: data,
          backgroundColor: "#002B49",
          hoverBackgroundColor: "#00A3E0",
          borderRadius: 6,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 }
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  renderUIPChart(projects) {
    const ctx = document.getElementById("uipChart");
    if (!ctx) return;

    if (this.uipChart) this.uipChart.destroy();

    const uipMap = {};
    projects.forEach(p => {
      const uipShort = p.uip.split("(")[0].trim();
      uipMap[uipShort] = (uipMap[uipShort] || 0) + 1;
    });

    const labels = Object.keys(uipMap);
    const data = Object.values(uipMap);

    this.uipChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Jumlah Proyek",
          data: data,
          backgroundColor: "#FFCC00",
          hoverBackgroundColor: "#00A3E0",
          borderRadius: 6,
          barThickness: 20
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "rgba(0,0,0,0.05)" }
          },
          y: {
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  renderPortfolioSCurve(projects) {
    const ctx = document.getElementById("portfolioSCurveChart");
    if (!ctx) return;

    if (this.portfolioSCurveChart) this.portfolioSCurveChart.destroy();

    // Generate cumulative monthly progress curve for portfolio
    const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const targetData = [12, 22, 35, 48, 60, 72, 81, 88, 93, 97, 99, 100];
    const actualData = [12, 23, 34, 46, 58, 70, 79, 83.8, null, null, null, null];

    this.portfolioSCurveChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Rencana Kumulatif (%)",
            data: targetData,
            borderColor: "#002B49",
            backgroundColor: "rgba(0, 43, 73, 0.05)",
            borderWidth: 3,
            borderDash: [5, 5],
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#002B49"
          },
          {
            label: "Realisasi Kumulatif (%)",
            data: actualData,
            borderColor: "#00A3E0",
            backgroundColor: "rgba(0, 163, 224, 0.15)",
            fill: true,
            borderWidth: 3.5,
            tension: 0.35,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: "#00A3E0",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: value => `${value}%`
            },
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          x: {
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 14,
              font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600" }
            }
          },
          tooltip: {
            callbacks: {
              label: context => ` ${context.dataset.label}: ${context.raw !== null ? context.raw + '%' : 'Belum Berjalan'}`
            }
          }
        }
      }
    });
  }

  renderProjectDetailSCurve(project, canvasId = "detailSCurveChart") {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.detailSCurveChart) {
      this.detailSCurveChart.destroy();
      this.detailSCurveChart = null;
    }

    if (!project.kurvaS || project.kurvaS.length === 0) return;

    const labels = project.kurvaS.map(k => k.minggu);
    const targetData = project.kurvaS.map(k => k.rencana);
    const actualData = project.kurvaS.map(k => k.realisasi);

    this.detailSCurveChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Rencana (%)",
            data: targetData,
            borderColor: "#0A2540",
            backgroundColor: "transparent",
            borderWidth: 2.5,
            borderDash: [6, 4],
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#0A2540"
          },
          {
            label: "Realisasi (%)",
            data: actualData,
            borderColor: project.deviasi < -5 ? "#EF4444" : "#00A3E0",
            backgroundColor: project.deviasi < -5 ? "rgba(239, 68, 68, 0.12)" : "rgba(0, 163, 224, 0.15)",
            fill: true,
            borderWidth: 3.5,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: project.deviasi < -5 ? "#EF4444" : "#00A3E0",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: value => `${value}%`
            },
            grid: { color: "rgba(0,0,0,0.06)" }
          },
          x: {
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              boxWidth: 14,
              font: { family: "'Plus Jakarta Sans', sans-serif", weight: "600", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: context => ` ${context.dataset.label}: ${context.raw !== null ? context.raw + '%' : 'Belum Terealisasi'}`
            }
          }
        }
      }
    });
  }
}

window.proTrackCharts = new ProTrackCharts();
