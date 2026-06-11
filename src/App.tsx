import React, { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { auth, db, loginWithGoogle, logout } from "./firebaseConfig";
import { 
  LogOut, FileText, Trash2, Layout, 
   Sparkles, Type, Move, Share2, ChevronDown
} from "lucide-react";

// --- CORE STRUCT DATA SCHEMAS ---
interface Job { id: string; company: string; location: string; title: string; duration: string; bullets: string[]; }
interface Degree { id: string; degree: string; school: string; graduation: string; details: string; }
interface Language { id: string; name: string; proficiency: string; }

interface CustomField { id: string; label: string; value: string; }
interface CustomComponent { id: string; title: string; fields: CustomField[]; }

interface ResumeState {
  id: string;
  title: string;
  templateId: "ats" | "modern" | "classic" | "minimalistic" | "foundation" | "academic" | "custom_sandbox";
  globalStyles: { fontFamily: string; primaryColor: string; textColor: string; headingSize: string; spacing: string; };
  layoutOrder: string[]; 
  personalInfo: { fullName: string; phone: string; email: string; location: string; links: string; avatarUrl: string; };
  summary: string;
  experience: Job[];
  education: Degree[];
  skills: string[];
  languages: Language[];
  customComponents: CustomComponent[];
}

interface PublicTemplateItem { id: string; title: string; creatorName: string; blueprintJson: string; }

// --- AUTOMATED DATA HYDRATION FACTORY ---
const createHydratedResume = (id: string, titleName: string, template: ResumeState["templateId"]): ResumeState => {
  return {
    id,
    title: titleName,
    templateId: template,
    globalStyles: {
      fontFamily: template === "academic" || template === "classic" ? "Playfair Display" : "Inter",
      primaryColor: template === "modern" ? "#1e3a8a" : template === "foundation" ? "#1e293b" : "#3b82f6",
      textColor: "#374151",
      headingSize: "text-md font-bold uppercase tracking-wider border-b pb-0.5 mb-2",
      spacing: "space-y-5"
    },
    layoutOrder: ["personal", "summary", "experience", "education", "skills", "languages"],
    personalInfo: {
      fullName: "Gaurang Dalal",
      phone: "+91 98765 43210",
      email: "gaurang.dalal@gmail.com",
      location: "Nashik, Maharashtra",
      links: "linkedin.com/in/gaurang | github.com/Gauruu",
      avatarUrl: ""
    },
    summary: "Results-driven full-stack developer with 1 year of professional experience designing high-efficiency automation tools. Proven capability to optimize Firestore schemas and construct interactive web components that minimize operational cloud infrastructure fees.",
    experience: [
      {
        id: "exp_1",
        company: "Atherium Pictures",
        location: "Nashik, MH",
        title: "Director & Full Stack Engineer",
        duration: "2025 - Present",
        bullets: [
          "Streamlined technical pipelines for post-production frameworks, enhancing project turnaround speeds by 25%.",
          "Engineered a lightweight data-sharing application leveraging clean PHP and MySQL parsing models to eliminate hosting fees.",
          "Directed cross-functional technical teams of 5 to successfully deliver visual layout automation tools ahead of critical timeline checkpoints."
        ]
      }
    ],
    education: [
      {
        id: "edu_1",
        degree: "Bachelor of Computer Applications (BCA)",
        school: "K.T.H.M. College",
        graduation: "Graduated 2026",
        details: "Focus on Database Architecture, Advanced Systems Design, and Cybersecurity auditing protocols."
      }
    ],
    skills: ["Flutter", "React.js", "PHP", "MySQL", "Tailwind CSS", "Firebase Auth", "Git Optimization", "Systems Architecture"],
    languages: [
      { id: "lang_1", name: "English", proficiency: "Full Professional Fluent" },
      { id: "lang_2", name: "Marathi", proficiency: "Native / Bilingual" }
    ],
    customComponents: []
  };
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  // loading state removed (unused)
  const [viewMode, setViewMode] = useState<'dashboard' | 'preset_editor' | 'sandbox_editor'>('dashboard');
  const [draftsList, setDraftsList] = useState<{ id: string; title: string; updatedAt: string; templateId: string; }[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<PublicTemplateItem[]>([]);
  const [activeResume, setActiveResume] = useState<ResumeState | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>("SAVE TO ACCOUNT");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [customFontInput, setCustomFontInput] = useState<string>("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // --- GOOGLE FONTS RUNTIME INJECTION ENGINE ---
  useEffect(() => {
    if ((viewMode === 'sandbox_editor' || viewMode === 'preset_editor') && activeResume?.globalStyles.fontFamily) {
      const activeFont = activeResume.globalStyles.fontFamily;
      if (["sans-serif", "serif", "monospace", "Inter"].includes(activeFont)) return;
      const linkId = `g-font-${activeFont.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(linkId)) {
        const fontLink = document.createElement("link");
        fontLink.id = linkId; fontLink.rel = "stylesheet";
        fontLink.href = `https://fonts.googleapis.com/css2?family=${activeFont.replace(/\s+/g, '+')}:wght@400;700;900&display=swap`;
        document.head.appendChild(fontLink);
      }
    }
  }, [activeResume?.globalStyles.fontFamily, viewMode]);

  // LOAD USER DRAFTS + MARKETPLACE INDEX
  const loadDashboardDataTree = async (uid: string) => {
    try {
      const privateSnapshot = await getDocs(collection(db, `users/${uid}/resumes`));
      const privateDrafts: any[] = [];
      privateSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.resumeJson) {
          const parsed = JSON.parse(data.resumeJson);
          privateDrafts.push({
            id: docSnap.id, title: parsed.title || "Untitled Layout Blueprint",
            updatedAt: data.updatedAt ? data.updatedAt.split('T')[0] : "2026-06-11", templateId: parsed.templateId
          });
        }
      });
      setDraftsList(privateDrafts);

      const publicSnapshot = await getDocs(collection(db, "public_templates"));
      const publicItems: PublicTemplateItem[] = [];
      publicSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.blueprintJson) {
          const parsedBlueprint = JSON.parse(data.blueprintJson);
          publicItems.push({
            id: docSnap.id, title: parsedBlueprint.title || "User Made Theme",
            creatorName: data.creatorName || "Anonymous Designer", blueprintJson: data.blueprintJson
          });
        }
      });
      setPublicTemplates(publicItems);
    } catch (err) {
      console.error("Dashboard data fetching stalled:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) loadDashboardDataTree(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const startNewResumeRoute = async (type: ResumeState["templateId"]) => {
    if (!user) return;
    const uniqueId = "res_" + Date.now().toString();
    const cleanBlueprint = createHydratedResume(uniqueId, type === "custom_sandbox" ? "Custom Sandbox Layout Design" : `Template Layout Blueprint #${draftsList.length + 1}`, type);
    setActiveResume(cleanBlueprint);
    setViewMode(type === "custom_sandbox" ? 'sandbox_editor' : 'preset_editor');
  };

  const createFromPublicBlueprintRoute = async (blueprintString: string) => {
    if (!user) return;
    const parsedBlueprint: ResumeState = JSON.parse(blueprintString);
    const uniqueClonedId = "res_" + Date.now().toString();
    const freshClonedPackage: ResumeState = {
      ...parsedBlueprint, id: uniqueClonedId, title: `${parsedBlueprint.title.split(" Blueprint")[0]} Cloned Framework`,
    };
    setActiveResume(freshClonedPackage);
    setViewMode(parsedBlueprint.templateId === "custom_sandbox" ? 'sandbox_editor' : 'preset_editor');
  };

  const openExistingDraftRoute = async (resumeId: string, templateId: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/resumes`, resumeId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setActiveResume(JSON.parse(docSnap.data().resumeJson));
        setViewMode(templateId === "custom_sandbox" ? 'sandbox_editor' : 'preset_editor');
      }
    } catch (err) {
      console.error("Recovery failure:", err);
    }
    // finished
  };

  const deleteDraftRecord = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    if (!user || !confirm("Erase this resume structure layout draft permanently?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/resumes`, resumeId));
      loadDashboardDataTree(user.uid);
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  const commitChangesToCloudDatabase = async () => {
    if (!user || !activeResume) return;
    setSaveStatus("SAVING CORE CLUSTER...");
    try {
      localStorage.setItem(`backup_${activeResume.id}`, JSON.stringify(activeResume));
      const userRootRef = doc(db, "users", user.uid);
      await setDoc(userRootRef, { email: user.email, lastActive: new Date().toISOString() }, { merge: true });

      const docRef = doc(db, `users/${user.uid}/resumes`, activeResume.id);
      await setDoc(docRef, { updatedAt: new Date().toISOString(), resumeJson: JSON.stringify(activeResume) }, { merge: true });
      
      setSaveStatus("SAVED LIVE! 👍");
      await loadDashboardDataTree(user.uid);
      setTimeout(() => setSaveStatus("SAVE TO ACCOUNT"), 2000);
    } catch (err) {
      console.error("Transaction breakdown error:", err);
      setSaveStatus("SAVE ERROR!");
    }
  };

  const publishTemplateBlueprint = async () => {
    if (!user || !activeResume) return;
    try {
      const globalBlueprintRef = doc(db, "public_templates", activeResume.id);
      const dynamicWireframeBlueprint = {
        ...activeResume,
        title: activeResume.title.includes("Blueprint") ? activeResume.title : `${activeResume.title} Blueprint`,
        personalInfo: { fullName: "Jane Doe", phone: "+123 45678", email: "jane.doe@email.com", location: "City, State", links: "github.com", avatarUrl: "" },
        summary: "This acts as a premium custom user-made layout template configuration.",
      };
      await setDoc(globalBlueprintRef, { blueprintJson: JSON.stringify(dynamicWireframeBlueprint), creatorName: user.displayName || "Anonymous Designer", createdAt: new Date().toISOString() });
      alert("🚀 Template Wired and Published Globally!");
      await loadDashboardDataTree(user.uid);
    } catch (err) {
      console.error("Global marketplace fail:", err);
    }
  };

  // --- HTML5 NATIVE DRAG HANDLERS ---
  const handleDragStart = (id: string) => setDraggedItemId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!activeResume || !draggedItemId || draggedItemId === targetId) return;
    const currentOrder = [...activeResume.layoutOrder];
    const draggedIdx = currentOrder.indexOf(draggedItemId);
    const targetIdx = currentOrder.indexOf(targetId);
    if (draggedIdx > -1 && targetIdx > -1) {
      currentOrder.splice(draggedIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedItemId);
      setActiveResume({ ...activeResume, layoutOrder: currentOrder });
    }
    setDraggedItemId(null);
  };

  const updatePersonalInfo = (field: string, value: string) => {
    if (!activeResume) return;
    setActiveResume({ ...activeResume, personalInfo: { ...activeResume.personalInfo, [field]: value } });
  };

  const handleImageBlobUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) updatePersonalInfo("avatarUrl", URL.createObjectURL(file));
  };

  const spawnCustomUserComponent = () => {
    if (!activeResume) return;
    const newCompId = "comp_" + Date.now().toString();
    const customComp: CustomComponent = {
      id: newCompId, title: "CUSTOM COMPONENT SECTION",
      fields: [{ id: "f_" + Date.now(), label: "Subtitle Label", value: "Custom content data metrics go here..." }]
    };
    setActiveResume({
      ...activeResume, customComponents: [...activeResume.customComponents, customComp], layoutOrder: [...activeResume.layoutOrder, newCompId]
    });
  };

  // --- SHARED COMPLEX MASTER FORM INPUT COMPONENT ---
  const renderMasterFormFields = () => {
    if (!activeResume) return null;
    return (
      <div className="space-y-4">
        {activeResume.layoutOrder.includes("personal") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <span className="text-[10px] font-black uppercase text-blue-600 block border-b pb-1">1. Contact Information</span>
            <input placeholder="Full Name" className="w-full border-2 border-black p-1 text-xs" value={activeResume.personalInfo.fullName} onChange={e => updatePersonalInfo("fullName", e.target.value)}/>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Phone" className="border-2 border-black p-1 text-xs" value={activeResume.personalInfo.phone} onChange={e => updatePersonalInfo("phone", e.target.value)}/>
              <input placeholder="Email" className="border-2 border-black p-1 text-xs" value={activeResume.personalInfo.email} onChange={e => updatePersonalInfo("email", e.target.value)}/>
            </div>
            <input placeholder="City, State" className="w-full border-2 border-black p-1 text-xs" value={activeResume.personalInfo.location} onChange={e => updatePersonalInfo("location", e.target.value)}/>
            <input placeholder="Links (Pipe separated)" className="w-full border-2 border-black p-1 text-xs" value={activeResume.personalInfo.links} onChange={e => updatePersonalInfo("links", e.target.value)}/>
            <input type="file" accept="image/*" className="text-[10px]" onChange={handleImageBlobUpload}/>
          </div>
        )}

        {activeResume.layoutOrder.includes("summary") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase text-blue-600 block border-b pb-1 mb-2">2. Elevator Pitch Summary</span>
            <textarea className="w-full border-2 border-black p-1 text-xs h-20 resize-none" value={activeResume.summary} onChange={e => setActiveResume({...activeResume, summary: e.target.value})}/>
          </div>
        )}

        {activeResume.layoutOrder.includes("experience") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex justify-between items-center border-b pb-1"><span className="text-[10px] font-black uppercase text-blue-600">3. Experience Chronology</span>
            <button onClick={() => setActiveResume({...activeResume, experience: [...activeResume.experience, { id: Date.now().toString(), company: "", location: "", title: "", duration: "", bullets: [""] }]})} className="bg-lime-300 border border-black text-[9px] font-bold px-1.5 py-0.5 uppercase cursor-pointer">+ Add Job</button></div>
            {activeResume.experience.map(j => (
              <div key={j.id} className="border-2 border-black p-2 bg-gray-50 relative space-y-1">
                <button onClick={() => setActiveResume({...activeResume, experience: activeResume.experience.filter(jo => jo.id !== j.id)})} className="absolute top-0 right-1 text-red-500 font-bold text-xs">×</button>
                <input placeholder="Company" className="w-full border p-0.5 text-[11px]" value={j.company} onChange={e => setActiveResume({...activeResume, experience: activeResume.experience.map(jo => jo.id === j.id ? {...jo, company: e.target.value} : jo)})} />
                <input placeholder="Title" className="w-full border p-0.5 text-[11px]" value={j.title} onChange={e => setActiveResume({...activeResume, experience: activeResume.experience.map(jo => jo.id === j.id ? {...jo, title: e.target.value} : jo)})} />
                <input placeholder="Duration" className="w-full border p-0.5 text-[11px]" value={j.duration} onChange={e => setActiveResume({...activeResume, experience: activeResume.experience.map(jo => jo.id === j.id ? {...jo, duration: e.target.value} : jo)})} />
                <textarea placeholder="Achievement metrics text line" className="w-full border p-0.5 text-[10px] h-12 resize-none" value={j.bullets[0]} onChange={e => setActiveResume({...activeResume, experience: activeResume.experience.map(jo => jo.id === j.id ? {...jo, bullets: [e.target.value]} : jo)})} />
              </div>
            ))}
          </div>
        )}

        {activeResume.layoutOrder.includes("education") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex justify-between items-center border-b pb-1"><span className="text-[10px] font-black uppercase text-blue-600">4. Education Program</span>
            <button onClick={() => setActiveResume({...activeResume, education: [...activeResume.education, { id: Date.now().toString(), degree: "", school: "", graduation: "", details: "" }]})} className="bg-lime-300 border border-black text-[9px] font-bold px-1.5 py-0.5 uppercase cursor-pointer">+ Add Edu</button></div>
            {activeResume.education.map(edu => (
              <div key={edu.id} className="border border-black p-2 bg-gray-50 relative space-y-1">
                <button onClick={() => setActiveResume({...activeResume, education: activeResume.education.filter(ed => ed.id !== edu.id)})} className="absolute top-0 right-1 text-red-500 font-bold text-xs">×</button>
                <input placeholder="Degree" className="w-full border p-0.5 text-[11px]" value={edu.degree} onChange={e => setActiveResume({...activeResume, education: activeResume.education.map(ed => ed.id === edu.id ? {...ed, degree: e.target.value} : ed)})} />
                <input placeholder="School" className="w-full border p-0.5 text-[11px]" value={edu.school} onChange={e => setActiveResume({...activeResume, education: activeResume.education.map(ed => ed.id === edu.id ? {...ed, school: e.target.value} : ed)})} />
                <input placeholder="Year" className="w-full border p-0.5 text-[11px]" value={edu.graduation} onChange={e => setActiveResume({...activeResume, education: activeResume.education.map(ed => ed.id === edu.id ? {...ed, graduation: e.target.value} : ed)})} />
              </div>
            ))}
          </div>
        )}

        {activeResume.layoutOrder.includes("skills") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase text-blue-600 block border-b pb-0.5 mb-1.5">5. Skills Portfolio Matrix</span>
            <input placeholder="Type tag name + press Enter" className="w-full border-2 border-black p-1 text-xs outline-none bg-white mb-2" onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault(); const val = e.currentTarget.value.trim();
                if (val) { setActiveResume({...activeResume, skills: [...activeResume.skills, val]}); e.currentTarget.value = ""; }
              }
            }}/>
            <div className="flex flex-wrap gap-1">
              {activeResume.skills.map((s, idx) => (
                <span key={idx} className="bg-yellow-100 border border-black text-[10px] font-bold px-1 flex items-center gap-0.5">{s}
                <button onClick={() => setActiveResume({...activeResume, skills: activeResume.skills.filter((_, i) => i !== idx)})} className="text-red-500 font-black">×</button></span>
              ))}
            </div>
          </div>
        )}

        {activeResume.layoutOrder.includes("languages") && (
          <div className="border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1.5">
            <div className="flex justify-between items-center border-b pb-0.5"><span className="text-[10px] font-black uppercase text-blue-600">6. Languages Mapping</span>
            <button onClick={() => setActiveResume({...activeResume, languages: [...activeResume.languages, { id: Date.now().toString(), name: "", proficiency: "Full Professional Fluent" }]})} className="bg-lime-300 border border-black text-[9px] font-bold px-1.5 py-0.5 uppercase cursor-pointer">+ Add Lang</button></div>
            {activeResume.languages.map(l => (
              <div key={l.id} className="flex gap-1 items-center relative pb-1 border-b">
                <input placeholder="Lang" className="border text-[11px] p-0.5 bg-white w-1/2" value={l.name} onChange={e => setActiveResume({...activeResume, languages: activeResume.languages.map(la => la.id === l.id ? {...la, name: e.target.value} : la)})} />
                <select className="border text-[10px] p-0.5 bg-white w-1/2 font-mono" value={l.proficiency} onChange={e => setActiveResume({...activeResume, languages: activeResume.languages.map(la => la.id === l.id ? {...la, proficiency: e.target.value} : la)})}>
                  <option value="Native / Bilingual">Native</option><option value="Full Professional Fluent">Fluent</option><option value="Intermediate">Intermediate</option>
                </select>
                <button onClick={() => setActiveResume({...activeResume, languages: activeResume.languages.filter(la => la.id !== l.id)})} className="text-red-500 font-extrabold text-xs px-0.5">×</button>
              </div>
            ))}
          </div>
        )}

        {activeResume.customComponents.map((comp, 
          
        ) => {
          if (!activeResume.layoutOrder.includes(comp.id)) return null;
          return (
            <div key={comp.id} className="border-4 border-black p-2.5 bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1.5">
              <span className="text-[9px] font-black uppercase text-amber-800 border-b block pb-0.5">Custom Component Field Box</span>
              <input className="w-full border p-1 text-xs font-black uppercase bg-white" value={comp.title} onChange={e => setActiveResume({...activeResume, customComponents: activeResume.customComponents.map(c => c.id === comp.id ? {...c, title: e.target.value} : c)})}/>
              {comp.fields.map((f, fIdx) => (
                <div key={f.id} className="space-y-0.5">
                  <input placeholder="Label Name" className="w-full border p-0.5 text-[10px] bg-white font-bold" value={f.label} onChange={e => {
                    const fArr = [...comp.fields]; fArr[fIdx].label = e.target.value;
                    setActiveResume({...activeResume, customComponents: activeResume.customComponents.map(c => c.id === comp.id ? {...c, fields: fArr} : c)});
                  }}/>
                  <textarea placeholder="Description Content Data" className="w-full border p-0.5 text-[11px] bg-white h-12 resize-none" value={f.value} onChange={e => {
                    const fArr = [...comp.fields]; fArr[fIdx].value = e.target.value;
                    setActiveResume({...activeResume, customComponents: activeResume.customComponents.map(c => c.id === comp.id ? {...c, fields: fArr} : c)});
                  }}/>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // --- SHARED MASTER RESUME LAYOUT PREVIEW CHANNELS ---
  const renderMasterSheetCanvas = () => {
    if (!activeResume) return null;
    const tId = activeResume.templateId;

    // --- TEMPLATE DESIGN 1: ATS CLASSIC STANDARD ---
    if (tId === "ats") {
      return (
        <div className="space-y-4 font-sans text-black text-[10pt]">
          <div className="text-center border-b pb-2">
            <h1 className="text-2xl font-bold tracking-tight uppercase">{activeResume.personalInfo.fullName || "YOUR NAME"}</h1>
            <p className="text-xs text-gray-700 mt-1">{activeResume.personalInfo.phone} | {activeResume.personalInfo.email} | {activeResume.personalInfo.location}</p>
            <p className="text-[11px] font-mono text-blue-700 mt-0.5">{activeResume.personalInfo.links}</p>
            {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full mt-2 mx-auto object-cover"/>}
          </div>
          <div><h2 className="text-xs font-bold uppercase tracking-wider border-b border-black mb-1">Professional Summary</h2><p className="text-gray-700 text-justify leading-relaxed">{activeResume.summary}</p></div>
          <div><h2 className="text-xs font-bold uppercase tracking-wider border-b border-black mb-1.5">Employment Timeline</h2>{activeResume.experience.map(j=>(<div key={j.id} className="mb-2"><div className="flex justify-between font-bold"><span>{j.title} — {j.company}</span><span className="text-gray-400 font-normal">{j.duration}</span></div><p className="text-gray-600 pl-1 mt-0.5">{j.bullets[0]}</p></div>))}</div>
          <div><h2 className="text-xs font-bold uppercase tracking-wider border-b border-black mb-1">Education Background</h2>{activeResume.education.map(e=>(<div key={e.id} className="flex justify-between mt-1"><span><strong className="text-gray-800">{e.degree}</strong>, {e.school}</span><span className="text-gray-400">{e.graduation}</span></div>))}</div>
          <div className="grid grid-cols-2 gap-4 border-t pt-2">
            <div><h4 className="font-bold text-xs uppercase border-b mb-1">Skills Array</h4><p className="text-xs font-mono">{activeResume.skills.join(", ")}</p></div>
            <div><h4 className="font-bold text-xs uppercase border-b mb-1">Languages</h4><p className="text-xs">{activeResume.languages.map(l=>`${l.name} (${l.proficiency})`).join(", ")}</p></div>
          </div>
        </div>
      );
    }

    // --- TEMPLATE DESIGN 2: MODERN GRAPHIC ASYMMETRIC ---
    if (tId === "modern") {
      return (
        <div className="flex gap-6 h-full text-slate-800 font-sans text-[10pt]">
          <div className="w-1/3 bg-slate-900 text-white p-5 -m-8 mr-2 flex flex-col justify-between">
            <div className="space-y-4 font-mono text-[11px] break-all">
              {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-white"/>}
              <h1 className="text-md font-black uppercase text-center text-white tracking-tight">{activeResume.personalInfo.fullName || "GAURANG"}</h1>
              <p>{activeResume.personalInfo.phone}</p><p>{activeResume.personalInfo.email}</p><p>{activeResume.personalInfo.location}</p>
              <div className="border-t border-slate-700 pt-3"><p className="font-bold text-slate-400 mb-1">SKILL MODEL</p><p className="text-[10px] text-slate-300 leading-normal">{activeResume.skills.join(", ")}</p></div>
            </div>
          </div>
          <div className="w-2/3 space-y-4 pt-2">
            <div><h2 className="text-xs font-bold uppercase text-blue-600 border-b pb-0.5 tracking-widest">Executive Brief</h2><p className="text-xs text-justify mt-1 leading-relaxed">{activeResume.summary}</p></div>
            <div><h2 className="text-xs font-bold uppercase text-blue-600 border-b pb-0.5 tracking-widest">Track Appointments</h2>{activeResume.experience.map(j=>(<div key={j.id} className="mt-2"><p className="font-bold text-gray-900">{j.title} @ {j.company}</p><p className="text-gray-400 text-[10px] italic">{j.duration}</p><p className="text-gray-600 mt-0.5 leading-relaxed">{j.bullets[0]}</p></div>))}</div>
            <div><h2 className="text-xs font-bold uppercase text-blue-600 border-b pb-0.5 tracking-widest">Academics</h2>{activeResume.education.map(e=>(<div key={e.id} className="mt-1.5 flex justify-between"><span><strong>{e.degree}</strong><p className="text-gray-500 text-[11px]">{e.school}</p></span><span className="text-gray-400 text-[11px]">{e.graduation}</span></div>))}</div>
          </div>
        </div>
      );
    }

    // --- TEMPLATE DESIGN 3: MINIMALISTIC LEFT LINE ASYMMETRIC ---
    if (tId === "minimalistic") {
      return (
        <div className="space-y-4 font-mono text-black text-[10pt]">
          <div className="border-b-4 border-black pb-2 flex justify-between items-baseline">
            <h1 className="text-xl font-black uppercase tracking-widest">{activeResume.personalInfo.fullName || "IDENTITY CORE"}</h1>
            <p className="text-[10px] text-gray-400 font-bold">{activeResume.personalInfo.location}</p>
          </div>
          <div className="text-[10px] text-gray-500 flex justify-between uppercase pb-1 border-b">
            <span>{activeResume.personalInfo.phone}</span><span>{activeResume.personalInfo.email}</span><span>{activeResume.personalInfo.links}</span>
          </div>
          {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-12 h-12 border border-black object-cover"/>}
          <p className="text-xs italic text-gray-600 text-justify">{activeResume.summary}</p>
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase bg-gray-100 pl-2 border-l-4 border-black py-0.5">Timeline Positions</h3>
            {activeResume.experience.map(j=>(<div key={j.id} className="grid grid-cols-4 gap-2 text-xs border-b pb-1.5"><span className="text-gray-400 font-bold">{j.duration}</span><div className="col-span-3 font-bold"><p>{j.company} / {j.title}</p><p className="text-gray-500 font-normal text-[11px] mt-0.5">{j.bullets[0]}</p></div></div>))}
          </div>
        </div>
      );
    }

    // --- TEMPLATE DESIGN 4: FOUNDATION BLOCK BOX SYSTEM ---
    if (tId === "foundation") {
      return (
        <div className="space-y-4 font-sans text-black text-[10pt]">
          <div className="bg-slate-100 border-l-4 border-slate-800 p-4 flex justify-between items-center rounded">
            <div><h1 className="text-lg font-black uppercase text-slate-800 tracking-tight">{activeResume.personalInfo.fullName}</h1><p className="text-xs font-mono text-slate-400">{activeResume.personalInfo.links}</p></div>
            <div className="text-right text-[10px] font-mono text-slate-500"><p>{activeResume.personalInfo.phone}</p><p>{activeResume.personalInfo.email}</p></div>
          </div>
          {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-16 h-16 border rounded object-cover"/>}
          <div><h3 className="text-xs font-bold uppercase bg-slate-800 text-white px-2 py-0.5 rounded inline-block mb-1">01 / Profile</h3><p className="text-xs text-gray-700 pl-1 mt-1 leading-normal">{activeResume.summary}</p></div>
          <div><h3 className="text-xs font-bold uppercase bg-slate-800 text-white px-2 py-0.5 rounded inline-block mb-1">02 / Tracker</h3>{activeResume.experience.map(j=>(<div key={j.id} className="text-xs mt-1.5 border-b pb-1.5 pl-1"><div className="flex justify-between font-bold text-slate-800"><span>{j.title} — {j.company}</span><span>{j.duration}</span></div><p className="text-gray-500 font-sans mt-0.5">{j.bullets[0]}</p></div>))}</div>
        </div>
      );
    }

    // --- TEMPLATE DESIGN 5: CLASSIC & 6: ACADEMIC SERIF BLUEPRINTS ---
    return (
      <div className="space-y-5 font-serif text-black text-[11pt]">
        <div className="text-center border-b-2 pb-2">
          <h1 className="text-2xl uppercase tracking-widest">{activeResume.personalInfo.fullName || "CURRICULUM VITAE"}</h1>
          <p className="text-xs font-sans text-gray-600 mt-1">{activeResume.personalInfo.location} • {activeResume.personalInfo.phone} • {activeResume.personalInfo.email}</p>
          <p className="text-xs font-mono text-blue-800 underline mt-0.5">{activeResume.personalInfo.links}</p>
          {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-16 h-16 rounded border mx-auto mt-2 object-cover"/>}
        </div>
        <div><h3 className="text-xs font-bold uppercase border-b border-black font-sans tracking-wide pb-0.5 mb-1">I. Objective & Statement Overview</h3><p className="text-xs text-justify leading-relaxed pl-1 text-gray-800">{activeResume.summary}</p></div>
        <div><h3 className="text-xs font-bold uppercase border-b border-black font-sans tracking-wide pb-0.5 mb-2">II. Appointments timeline</h3>{activeResume.experience.map(j=>(<div key={j.id} className="text-xs mb-3 pl-1"><div className="flex justify-between font-bold"><span>{j.company} — {j.title}</span><span className="font-normal italic text-gray-400">{j.duration}</span></div><p className="text-gray-600 text-justify mt-1 pl-1 font-sans text-[11px]">{j.bullets[0]}</p></div>))}</div>
        <div><h3 className="text-xs font-bold uppercase border-b border-black font-sans tracking-wide pb-0.5 mb-2">III. Credentials</h3>{activeResume.education.map(e=>(<div key={e.id} className="text-xs flex justify-between pl-1"><span><strong>{e.school}</strong> — <em>{e.degree}</em></span><span className="text-gray-400 font-sans text-[11px]">{e.graduation}</span></div>))}</div>
      </div>
    );
  };

  // --- THE MASTER RENDERING MATRICES SPECIFIC TO THE SANDBOX ORDER ARRAYS ---
  const renderSandboxCanvasLoop = () => {
    if (!activeResume) return null;
    return activeResume.layoutOrder.map((sectionKey) => {
      if (sectionKey === "personal") {
        return (
          <div key="personal" className="mb-6 text-center">
            <h1 className="text-3xl font-black tracking-tight uppercase mb-1">{activeResume.personalInfo.fullName || "YOUR FULL NAME"}</h1>
            <div className="text-xs text-gray-600 space-x-1.5 font-mono"><span>{activeResume.personalInfo.phone}</span>|<span>{activeResume.personalInfo.email}</span>|<span>{activeResume.personalInfo.location}</span></div>
            <p className="text-[11px] text-blue-800 font-mono mt-0.5 underline">{activeResume.personalInfo.links}</p>
            {activeResume.personalInfo.avatarUrl && <img src={activeResume.personalInfo.avatarUrl} alt="avatar" className="w-16 h-16 rounded-full border mt-2 mx-auto object-cover"/>}
            <div style={{ borderColor: activeResume.globalStyles.primaryColor }} className="border-b-2 mt-4 w-full" />
          </div>
        );
      }
      if (sectionKey === "summary" && activeResume.summary) {
        return (
          <div key="summary" className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>Professional Objective</h3>
            <p className="text-xs text-gray-600 text-justify leading-relaxed mt-1">{activeResume.summary}</p>
          </div>
        );
      }
      if (sectionKey === "experience" && activeResume.experience.length > 0) {
        return (
          <div key="experience" className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>Employment Track Timeline</h3>
            {activeResume.experience.map(j => (
              <div key={j.id} className="mt-2 text-xs">
                <div className="flex justify-between font-bold text-gray-800"><span>{j.title} — {j.company}</span><span className="font-normal text-gray-400">{j.duration}</span></div>
                <p className="text-gray-600 text-justify mt-0.5 pl-1 leading-normal">{j.bullets[0]}</p>
              </div>
            ))}
          </div>
        );
      }
      if (sectionKey === "education" && activeResume.education.length > 0) {
        return (
          <div key="education" className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>Education History</h3>
            {activeResume.education.map(e => (
              <div key={e.id} className="flex justify-between text-xs mt-1.5 pl-1">
                <span><span className="font-bold">{e.degree}</span>, {e.school}</span><span className="text-gray-400">{e.graduation}</span>
              </div>
            ))}
          </div>
        );
      }
      if (sectionKey === "skills" && activeResume.skills.length > 0) {
        return (
          <div key="skills" className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>Key Competencies</h3>
            <p className="text-xs text-gray-700 mt-1 pl-1 font-mono tracking-tight">{activeResume.skills.join(" • ")}</p>
          </div>
        );
      }
      if (sectionKey === "languages" && activeResume.languages.length > 0) {
        return (
          <div key="languages" className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>Languages Matrix</h3>
            <p className="text-xs text-gray-700 mt-1 pl-1">{activeResume.languages.map(l => `${l.name} (${l.proficiency})`).join(", ")}</p>
          </div>
        );
      }
      if (sectionKey.startsWith("comp_")) {
        const targetCustomComponent = activeResume.customComponents.find(c => c.id === sectionKey);
        if (!targetCustomComponent) return null;
        return (
          <div key={targetCustomComponent.id} className="mb-5">
            <h3 className={`${activeResume.globalStyles.headingSize} text-gray-800 uppercase`} style={{ borderColor: activeResume.globalStyles.primaryColor }}>{targetCustomComponent.title}</h3>
            {targetCustomComponent.fields.map(f => (
              <div key={f.id} className="text-xs mt-1 pl-1">
                <span className="font-bold block text-gray-500 uppercase text-[9px] font-mono">{f.label}</span>
                <p className="text-gray-700 text-justify leading-relaxed mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] font-mono text-black selection:bg-yellow-200">
      {!user ? (
        /* HERO MARKETING DECK LANDING PAGE */
        <div className="flex flex-col min-h-screen">
          <nav className="flex items-center justify-between border-b-4 border-black bg-white px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <FileText size={28} strokeWidth={3} />
              <span className="text-xl sm:text-2xl font-black uppercase tracking-tight">AutomateResume</span>
            </div>
            <button onClick={loginWithGoogle} className="border-2 border-black bg-yellow-300 px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 cursor-pointer">Login Hub</button>
          </nav>

          <header className="border-b-4 border-black py-24 px-6 text-center bg-white relative">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              DITCH THE LAYOUT CRASHES.<br/>
              <span className="bg-lime-300 border-4 border-black px-4 py-1 inline-block my-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1">
                COMPILE WITH REAL-TIME FLOW.
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-gray-600 max-w-xl mx-auto uppercase tracking-wider mt-4">
              Compile ATS-ready documents instantly using 6 robust structural prefilled themes, or launch the interactive workspace sandbox to shuffle components at will.
            </p>
            <div className="mt-8">
              <button onClick={loginWithGoogle} className="border-4 border-black bg-cyan-300 px-8 py-4 font-black uppercase text-sm sm:text-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer">
                Get Started Free →
              </button>
            </div>
          </header>

          <section className="bg-black text-white py-3 border-b-4 border-black font-black uppercase text-[10px] tracking-widest overflow-hidden whitespace-nowrap flex select-none">
            <div className="animate-marquee flex gap-8">
              <span>⚡ ATS-OPTIMIZED DESIGN PIPELINES • ⚡ ZERO DATA Overwrites • ⚡ DYNAMIC GOOGLE FONTS INJECTOR • </span>
            </div>
          </section>

          <section className="max-w-4xl mx-auto w-full px-6 py-12 space-y-3">
            <h3 className="text-lg font-black uppercase border-b-4 border-black pb-1 mb-4">FAQ Handbook</h3>
            {[
              { q: "Is my workspace structural data secure?", a: "Yes. Every profile serializes text arrays directly into personal production-mode isolated collection channels in Firestore." },
              { q: "Can I add infinite experience bullet lists?", a: "Yes. The custom canvas sandbox uses modular appending states to let you inject unlimited jobs, fields, and custom modules." }
            ].map((f, i) => (
              <div key={i} className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="w-full text-left font-black uppercase text-xs flex justify-between items-center">
                  <span>{f.q}</span> <ChevronDown size={14} className={`transform transition-transform ${faqOpen === i ? "rotate-180" : ""}`}/>
                </button>
                {faqOpen === i && <p className="mt-2 text-xs font-bold text-gray-600 border-t border-black/10 pt-2 leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </section>
        </div>
      ) : (
        /* CORE USER DASHBOARD COMMAND COCKPIT */
        <div className="flex flex-col min-h-screen">
          
          {viewMode === 'dashboard' && (
            <>
              <nav className="flex items-center justify-between border-b-4 border-black bg-white px-6 py-4">
                <span className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">📋AutomateResume</span>
                <button onClick={logout} className="border-2 border-black bg-red-400 px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"><LogOut size={14}/> Sign Out</button>
              </nav>

              <main className="max-w-6xl mx-auto w-full p-6 flex-1 space-y-12">
                <section>
                  <h2 className="text-md font-black uppercase mb-4 inline-block bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Launch Workspace Options</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border-4 border-black bg-emerald-100 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-black uppercase flex items-center gap-2 mb-2"><Layout strokeWidth={3}/> Create From Template</h3>
                        <p className="text-xs font-medium text-gray-700 uppercase mb-4">Choose from 6 fully-hydrated, prefilled design themes.</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(["ats", "modern", "classic", "minimalistic", "foundation", "academic"] as const).map(tmpl => (
                          <button key={tmpl} onClick={() => startNewResumeRoute(tmpl)} className="bg-white border-2 border-black p-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-center hover:bg-gray-50 uppercase">{tmpl}</button>
                        ))}
                      </div>
                    </div>

                    <div onClick={() => startNewResumeRoute("custom_sandbox")} className="border-4 border-black bg-purple-200 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col justify-between group">
                      <div>
                        <h3 className="text-xl font-black uppercase flex items-center gap-2 mb-2"><Sparkles strokeWidth={3}/> Build Your Own Template</h3>
                        <p className="text-xs font-medium text-gray-700 uppercase">Launches the master hydrated canvas layer with HTML5 Drag & Drop sorting systems.</p>
                      </div>
                      <span className="mt-6 border-2 border-black bg-black text-white text-xs font-black p-2 uppercase text-center">Open Custom Sandbox Hub →</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-md font-black uppercase mb-4 inline-block bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">My Private Layout Drafts ({draftsList.length})</h2>
                  {draftsList.length === 0 ? (
                    <div className="border-4 border-dashed border-black p-8 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><p className="text-sm font-bold uppercase text-gray-400">No layout draft data links synced inside cloud nodes.</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {draftsList.map(draft => (
                        <div key={draft.id} onClick={() => openExistingDraftRoute(draft.id, draft.templateId)} className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer relative flex flex-col justify-between">
                          <button onClick={(e) => deleteDraftRecord(e, draft.id)} className="absolute top-3 right-3 text-red-500 hover:scale-110 p-1"><Trash2 size={16}/></button>
                          <div>
                            <span className="bg-black text-white text-[9px] font-bold uppercase px-1.5 py-0.5 mb-2 inline-block">Engine: {draft.templateId}</span>
                            <h3 className="text-md font-black uppercase tracking-tight line-clamp-1 pr-6">{draft.title}</h3>
                            <p className="text-[10px] text-gray-400 uppercase mt-1">Synced: {draft.updatedAt}</p>
                          </div>
                          <div className="mt-4 pt-2 border-t text-xs font-black text-cyan-600 uppercase">Modify Document Structure →</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-md font-black uppercase mb-4 inline-block bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Templates by Users ({publicTemplates.length})</h2>
                  {publicTemplates.length === 0 ? (
                    <div className="border-4 border-dashed border-black p-12 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><p className="text-sm font-bold uppercase text-gray-400">Public marketplace wireframe pool empty. Publish a custom framework blueprint layout!</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {publicTemplates.map(pub => (
                        <div key={pub.id} onClick={() => createFromPublicBlueprintRoute(pub.blueprintJson)} className="border-4 border-black bg-amber-50 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] transition-all cursor-pointer flex flex-col justify-between group">
                          <div><span className="bg-purple-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 mb-2 inline-block">PUBLIC SHARE</span>
                          <h3 className="text-sm font-black uppercase line-clamp-2">{pub.title}</h3>
                          <p className="text-[10px] text-gray-500 font-bold mt-2 uppercase">Designer: <span className="text-black bg-yellow-200 px-1 border border-black font-extrabold">{pub.creatorName}</span></p></div>
                          <div className="mt-4 pt-2 border-t text-xs font-black text-purple-700 uppercase">Clone Framework Layout →</div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </>
          )}

          {/* VIEW 2: HYDRATED MULTI-PRESETS FIXED WORKSPACE */}
          {viewMode === 'preset_editor' && activeResume && (
            <>
              <nav className="flex items-center justify-between border-b-4 border-black bg-white px-6 py-4 print:hidden">
                <button onClick={() => setViewMode('dashboard')} className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">← Dashboard</button>
                <div className="flex items-center gap-2">
                  <input className="border-2 border-black p-1 text-xs font-black uppercase bg-yellow-50 text-center focus:bg-yellow-100 outline-none w-48" value={activeResume.title} onChange={e => setActiveResume({...activeResume, title: e.target.value})}/>
                  <button onClick={commitChangesToCloudDatabase} className="border-2 border-black bg-yellow-300 px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">{saveStatus}</button>
                  <button onClick={() => window.print()} className="border-2 border-black bg-lime-400 px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">Print PDF</button>
                </div>
              </nav>
              <div className="flex flex-1 flex-col md:flex-row bg-white print:block overflow-hidden">
                <aside className="w-full md:w-1/2 p-6 border-r-4 border-black max-h-[calc(100vh-80px)] overflow-y-auto print:hidden space-y-4 bg-white">
                  <section className="border-4 border-black p-4 bg-purple-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-xs font-black uppercase mb-2">Switch Preset Sheet Blueprint</h3>
                    <div className="grid grid-cols-3 gap-1">
                      {(["ats", "modern", "classic", "minimalistic", "foundation", "academic"] as const).map(t => (
                        <button key={t} onClick={() => setActiveResume({...activeResume, templateId: t})} className={`border border-black p-1 text-[9px] font-black uppercase ${activeResume.templateId === t ? "bg-black text-white" : "bg-white cursor-pointer"}`}>{t}</button>
                      ))}
                    </div>
                  </section>
                  {renderMasterFormFields()}
                </aside>
                <main className="w-full md:w-1/2 p-6 bg-[#1A1A1A] flex justify-center overflow-y-auto print:w-full print:bg-white print:p-0">
                  <div className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 border shadow-xl print:shadow-none">
                    {renderMasterSheetCanvas()}
                  </div>
                </main>
              </div>
            </>
          )}

          {/* VIEW 3: THREE-COLUMN SAAS ADVANCED CUSTOM BLUEPRINTS SANDBOX CANVASES */}
          {viewMode === 'sandbox_editor' && activeResume && (
            <>
              <nav className="flex items-center justify-between border-b-4 border-black bg-white px-6 py-4 print:hidden">
                <button onClick={() => setViewMode('dashboard')} className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">← Dashboard</button>
                <div className="flex flex-wrap items-center gap-2">
                  <input className="border-2 border-black p-1.5 text-xs font-black uppercase bg-purple-50 text-center w-48 outline-none focus:bg-purple-100" value={activeResume.title} onChange={e => setActiveResume({...activeResume, title: e.target.value})}/>
                  <button onClick={publishTemplateBlueprint} className="border-2 border-black bg-purple-300 px-4 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"><Share2 size={12} className="inline mr-1"/> Publish Template</button>
                  <button onClick={commitChangesToCloudDatabase} className="border-2 border-black bg-yellow-300 px-4 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">{saveStatus}</button>
                  <button onClick={() => window.print()} className="border-2 border-black bg-lime-400 px-4 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">Export PDF</button>
                </div>
              </nav>

              <div className="flex flex-1 flex-col lg:flex-row max-h-[calc(100vh-80px)] overflow-hidden print:block print:max-h-none">
                
                {/* COLUMN 1: INTERACTIVE TYPOGRAPHY CONTROLLER SIDEBAR */}
                <aside className="w-full lg:w-1/4 p-4 border-r-4 border-black bg-white overflow-y-auto print:hidden space-y-4">
                  <div className="border-4 border-black bg-amber-100 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <h3 className="text-xs font-black uppercase flex items-center gap-1 mb-2"><Type size={14}/> Typography Core</h3>
                    <select className="w-full border-2 border-black bg-white p-1 text-xs font-mono mb-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] outline-none" value={activeResume.globalStyles.fontFamily} onChange={e => setActiveResume({...activeResume, globalStyles: {...activeResume.globalStyles, fontFamily: e.target.value}})}>
                      <option value="Inter">Inter (Sans)</option><option value="Poppins">Poppins (Rounded)</option><option value="Roboto">Roboto (Symmetrical)</option>
                      <option value="Playfair Display">Playfair Display (Serif)</option><option value="Montserrat">Montserrat (Geometric)</option><option value="Fira Code">Fira Code (Mono)</option>
                    </select>
                    <input placeholder="Type Custom Google Font Name + Enter" className="w-full border-2 border-black p-1 text-xs bg-white font-mono outline-none" value={customFontInput} onChange={e => setCustomFontInput(e.target.value)} onKeyDown={e => {
                      if (e.key === 'Enter' && customFontInput.trim()) {
                        e.preventDefault(); setActiveResume({...activeResume, globalStyles: {...activeResume.globalStyles, fontFamily: customFontInput.trim()}}); setCustomFontInput("");
                      }
                    }}/>
                  </div>
                  <div className="border-4 border-black bg-cyan-100 p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                    <input type="color" className="border-2 border-black w-8 h-8 cursor-pointer" value={activeResume.globalStyles.primaryColor} onChange={e => setActiveResume({...activeResume, globalStyles: {...activeResume.globalStyles, primaryColor: e.target.value}})}/>
                    <span className="text-[10px] font-black uppercase text-gray-600">Active Rule Color</span>
                  </div>
                  <div className="border-4 border-black p-3 bg-purple-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
                    <h3 className="text-xs font-black uppercase mb-1">+ Custom Container</h3>
                    <button onClick={spawnCustomUserComponent} className="w-full border-2 border-black bg-white py-1.5 text-xs font-black uppercase hover:bg-purple-100 cursor-pointer">+ Spawn User Block</button>
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-black/10">
                      {["personal", "summary", "experience", "education", "skills", "languages"].map(s => (
                        <button key={s} onClick={() => { if(!activeResume.layoutOrder.includes(s)) setActiveResume({...activeResume, layoutOrder: [...activeResume.layoutOrder, s]}) }} className="bg-white border border-black p-0.5 text-[9px] uppercase font-black cursor-pointer hover:bg-gray-50">+ {s}</button>
                      ))}
                    </div>
                  </div>
                </aside>

                {/* COLUMN 2: DRAG Blueprints INDEX SIFTER DESK + COMPLETE FORMS IN Sandbox */}
                <aside className="w-full lg:w-1/4 p-4 border-r-4 border-black bg-[#EAEAEA] overflow-y-auto print:hidden space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Drag Reorder Strip</h3>
                  <div className="space-y-1">
                    {activeResume.layoutOrder.map(layoutId => {
                      const isCustom = layoutId.startsWith("comp_");
                      let label = layoutId.toUpperCase();
                      if (isCustom) {
                        const target = activeResume.customComponents.find(c => c.id === layoutId);
                        label = target ? `CUSTOM: ${target.title}` : "CUSTOM CONTAINER";
                      }
                      return (
                        <div key={layoutId} draggable onDragStart={() => handleDragStart(layoutId)} onDragOver={handleDragOver} onDrop={() => handleDrop(layoutId)} className={`border-2 border-black p-2 bg-white flex items-center justify-between text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-grab ${draggedItemId === layoutId ? "opacity-20" : ""}`}>
                          <span className="flex items-center gap-1"><Move size={12} className="text-gray-400"/> {label}</span>
                          <button onClick={() => setActiveResume({...activeResume, layoutOrder: activeResume.layoutOrder.filter(id => id !== layoutId)})} className="text-red-500 font-extrabold px-1">×</button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t-2 border-black space-y-4">
                    {renderMasterFormFields()}
                  </div>
                </aside>

                {/* COLUMN 3: REAL-TIME SANDBOX CANVAS PREVIEW SHEET */}
                <main className="w-full lg:w-1/2 p-4 lg:p-8 bg-[#181818] overflow-y-auto flex justify-center items-start print:w-full print:p-0 print:bg-white print:max-h-none print:overflow-visible">
                  <div id="resume-sheet" className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 text-black shadow-2xl print:shadow-none print:p-0" style={{ fontFamily: activeResume.globalStyles.fontFamily }}>
                    {renderSandboxCanvasLoop()}
                  </div>
                </main>

              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

export default App;