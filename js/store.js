/**
 * PLN Pro-Track - Local State & Storage Manager
 */

const STORAGE_KEY = "PLN_PRO_TRACK_PROJECTS_V1";

class ProTrackStore {
  constructor() {
    this.projects = this.loadProjects();
  }

  loadProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Gagal membaca LocalStorage, memuat dataset awal PLN:", e);
    }
    // Default initial data
    this.saveProjects(INITIAL_PROJECTS);
    return JSON.parse(JSON.stringify(INITIAL_PROJECTS));
  }

  saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      this.projects = projects;
    } catch (e) {
      console.error("Gagal menyimpan ke LocalStorage:", e);
    }
  }

  getAll() {
    return [...this.projects];
  }

  getById(id) {
    return this.projects.find(p => p.id === id) || null;
  }

  addProject(projectData) {
    const newId = `PRJ-${new Date().getFullYear()}-${String(this.projects.length + 1).padStart(3, "0")}`;
    const deviasi = Number((projectData.progresRealisasi - projectData.progresRencana).toFixed(1));
    
    // Auto status determination
    let status = projectData.status || "In Progress";
    if (projectData.progresRealisasi >= 100) {
      status = "COD / Energized";
    } else if (deviasi < -5.0) {
      status = "Critical";
    } else if (projectData.progresRealisasi >= 95) {
      status = "Testing";
    }

    const newProject = {
      id: newId,
      kode: projectData.kode || `PRJ-${Date.now().toString().slice(-4)}`,
      nama: projectData.nama,
      tipe: projectData.tipe,
      tegangan: projectData.tegangan || "150 kV",
      uip: projectData.uip,
      upp: projectData.upp || "UPP Wilayah",
      lokasi: projectData.lokasi,
      koordinat: projectData.koordinat && projectData.koordinat.length === 2 ? projectData.koordinat : [-6.2088, 106.8456], // Default Jakarta
      kontraktor: projectData.kontraktor,
      nomorKontrak: projectData.nomorKontrak || `KTR-${Date.now().toString().slice(-6)}`,
      nilaiKontrak: Number(projectData.nilaiKontrak) || 0,
      tglMulai: projectData.tglMulai,
      targetCOD: projectData.targetCOD,
      status: status,
      progresRencana: Number(projectData.progresRencana) || 0,
      progresRealisasi: Number(projectData.progresRealisasi) || 0,
      deviasi: deviasi,
      penyerapanAnggaran: Number(projectData.penyerapanAnggaran) || 0,
      deskripsi: projectData.deskripsi || "",
      milestones: projectData.milestones || [
        { id: "m1", nama: "Perizinan & Pembebasan Lahan / ROW", bobot: 20, rencana: 100, realisasi: 100, status: "Done" },
        { id: "m2", nama: "Pekerjaan Sipil & Pondasi", bobot: 30, rencana: 50, realisasi: 50, status: "In Progress" },
        { id: "m3", nama: "Pemasangan Peralatan / Erection", bobot: 30, rencana: 20, realisasi: 20, status: "In Progress" },
        { id: "m4", nama: "Testing, Commissioning & Energizing", bobot: 20, rencana: 0, realisasi: 0, status: "Pending" }
      ],
      kurvaS: projectData.kurvaS || [
        { minggu: "Bulan 1", rencana: 10, realisasi: 10 },
        { minggu: "Bulan 2", rencana: 25, realisasi: 24 },
        { minggu: "Bulan 3", rencana: Number(projectData.progresRencana) || 40, realisasi: Number(projectData.progresRealisasi) || 38 },
        { minggu: "Target Akhir", rencana: 100, realisasi: null }
      ],
      kendala: projectData.kendala || [],
      dokumentasi: projectData.dokumentasi || []
    };

    const updated = [newProject, ...this.projects];
    this.saveProjects(updated);
    return newProject;
  }

  updateProject(id, updatedFields) {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    const project = { ...this.projects[index], ...updatedFields };
    if (updatedFields.progresRencana !== undefined || updatedFields.progresRealisasi !== undefined) {
      project.deviasi = Number((project.progresRealisasi - project.progresRencana).toFixed(1));
      if (project.progresRealisasi >= 100) {
        project.status = "COD / Energized";
      } else if (project.deviasi < -5.0 && project.status !== "Planning") {
        project.status = "Critical";
      } else if (project.status === "Critical" && project.deviasi >= -5.0) {
        project.status = "In Progress";
      }
    }

    this.projects[index] = project;
    this.saveProjects(this.projects);
    return project;
  }

  deleteProject(id) {
    const updated = this.projects.filter(p => p.id !== id);
    this.saveProjects(updated);
    return true;
  }

  addKendala(projectId, kendala) {
    const project = this.getById(projectId);
    if (!project) return false;

    const newKendala = {
      id: `K-${Date.now().toString().slice(-4)}`,
      kategori: kendala.kategori || "Umum",
      deskripsi: kendala.deskripsi,
      dampak: kendala.dampak || "-",
      tindakanMitigasi: kendala.tindakanMitigasi || "-",
      status: kendala.status || "Open",
      tglLapor: kendala.tglLapor || new Date().toISOString().split("T")[0]
    };

    project.kendala.unshift(newKendala);
    // Mark as Critical if open and serious
    if (newKendala.status === "Open" && project.status === "In Progress" && project.deviasi < 0) {
      project.status = "Critical";
    }

    this.updateProject(projectId, project);
    return newKendala;
  }

  updateKendalaStatus(projectId, kendalaId, status) {
    const project = this.getById(projectId);
    if (!project) return false;

    const kIndex = project.kendala.findIndex(k => k.id === kendalaId);
    if (kIndex !== -1) {
      project.kendala[kIndex].status = status;
      this.updateProject(projectId, project);
      return true;
    }
    return false;
  }

  addDokumentasi(projectId, doc) {
    const project = this.getById(projectId);
    if (!project) return false;

    const newDoc = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      judul: doc.judul,
      tgl: doc.tgl || new Date().toISOString().split("T")[0],
      tahap: doc.tahap || "Konstruksi",
      foto: doc.foto
    };

    project.dokumentasi.unshift(newDoc);
    this.updateProject(projectId, project);
    return newDoc;
  }

  addWeeklyProgress(projectId, { mingguLabel, rencana, realisasi, catatan }) {
    const project = this.getById(projectId);
    if (!project) return false;

    // Check if minggu already exists
    const sIndex = project.kurvaS.findIndex(s => s.minggu === mingguLabel);
    if (sIndex !== -1) {
      project.kurvaS[sIndex].rencana = Number(rencana);
      project.kurvaS[sIndex].realisasi = Number(realisasi);
    } else {
      project.kurvaS.push({
        minggu: mingguLabel,
        rencana: Number(rencana),
        realisasi: Number(realisasi)
      });
    }

    // Update overall progress
    project.progresRencana = Number(rencana);
    project.progresRealisasi = Number(realisasi);
    project.deviasi = Number((project.progresRealisasi - project.progresRencana).toFixed(1));

    if (project.progresRealisasi >= 100) {
      project.status = "COD / Energized";
    } else if (project.deviasi < -5.0) {
      project.status = "Critical";
    }

    this.updateProject(projectId, project);
    return true;
  }

  resetToDefault() {
    this.saveProjects(INITIAL_PROJECTS);
    return this.getAll();
  }

  // Summary Metrics for Dashboard
  getKPI() {
    const total = this.projects.length;
    if (total === 0) {
      return {
        total: 0,
        inProgress: 0,
        critical: 0,
        testing: 0,
        cod: 0,
        avgRencana: 0,
        avgRealisasi: 0,
        avgDeviasi: 0,
        totalAnggaran: 0,
        totalPenyerapanRp: 0,
        avgPenyerapanPersen: 0,
        totalKendalaOpen: 0
      };
    }

    let inProgress = 0;
    let critical = 0;
    let testing = 0;
    let cod = 0;
    let planning = 0;
    let sumRencana = 0;
    let sumRealisasi = 0;
    let sumAnggaran = 0;
    let sumPenyerapanRp = 0;
    let totalKendalaOpen = 0;

    this.projects.forEach(p => {
      if (p.status === "In Progress") inProgress++;
      else if (p.status === "Critical") critical++;
      else if (p.status === "Testing") testing++;
      else if (p.status === "COD / Energized") cod++;
      else if (p.status === "Planning") planning++;

      sumRencana += Number(p.progresRencana) || 0;
      sumRealisasi += Number(p.progresRealisasi) || 0;
      
      const nilai = Number(p.nilaiKontrak) || 0;
      sumAnggaran += nilai;
      const penyerapanPct = Number(p.penyerapanAnggaran) || 0;
      sumPenyerapanRp += (nilai * penyerapanPct) / 100;

      if (p.kendala && Array.isArray(p.kendala)) {
        totalKendalaOpen += p.kendala.filter(k => k.status === "Open").length;
      }
    });

    const avgRencana = Number((sumRencana / total).toFixed(1));
    const avgRealisasi = Number((sumRealisasi / total).toFixed(1));
    const avgDeviasi = Number((avgRealisasi - avgRencana).toFixed(1));
    const avgPenyerapanPersen = sumAnggaran > 0 ? Number(((sumPenyerapanRp / sumAnggaran) * 100).toFixed(1)) : 0;

    return {
      total,
      inProgress,
      critical,
      testing,
      cod,
      planning,
      avgRencana,
      avgRealisasi,
      avgDeviasi,
      totalAnggaran: sumAnggaran,
      totalPenyerapanRp: sumPenyerapanRp,
      avgPenyerapanPersen,
      totalKendalaOpen
    };
  }
}

// Global Store Instance
window.proTrackStore = new ProTrackStore();
