import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // Auth
  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      return {
        user: {
          id: user.uid,
          email: user.email,
          name: userData?.name || user.displayName || user.email?.split('@')[0] || 'Usuário',
          role: userData?.role || 'user'
        }
      };
    } catch (error) {
      throw error;
    }
  },

  async register(email: string, password: string, name: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name,
        role: 'user',
        createdAt: new Date().toISOString()
      });
      
      return user;
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    await signOut(auth);
  },

  // Stages
  async getStages() {
    const path = 'stages';
    try {
      const q = query(collection(db, path), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createStage(stage: any) {
    const path = 'stages';
    try {
      const docRef = await addDoc(collection(db, path), stage);
      return { id: docRef.id, ...stage };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateStage(id: string | number, updates: any) {
    const docId = String(id);
    const path = `stages/${docId}`;
    try {
      await updateDoc(doc(db, 'stages', docId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteStage(id: string | number) {
    const docId = String(id);
    const path = `stages/${docId}`;
    try {
      await deleteDoc(doc(db, 'stages', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Leads
  async getLeads() {
    const path = 'leads';
    try {
      const q = query(collection(db, path), where('owner_id', '==', auth.currentUser?.uid), orderBy('updated_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createLead(lead: any) {
    const path = 'leads';
    try {
      const leadData = {
        ...lead,
        owner_id: auth.currentUser?.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), leadData);
      return { id: docRef.id, ...leadData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateLead(id: string | number, updates: any) {
    const docId = String(id);
    const path = `leads/${docId}`;
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      await updateDoc(doc(db, 'leads', docId), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteLead(id: string | number) {
    const docId = String(id);
    const path = `leads/${docId}`;
    try {
      await deleteDoc(doc(db, 'leads', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Interactions
  async getInteractions(leadId: string | number) {
    const docId = String(leadId);
    const path = 'interactions';
    try {
      const q = query(collection(db, path), where('lead_id', '==', docId), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createInteraction(interaction: any) {
    const path = 'interactions';
    try {
      const interactionData = {
        ...interaction,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), interactionData);
      return { id: docRef.id, ...interactionData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateInteraction(id: string | number, updates: any) {
    const docId = String(id);
    const path = `interactions/${docId}`;
    try {
      await updateDoc(doc(db, 'interactions', docId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteInteraction(id: string | number) {
    const docId = String(id);
    const path = `interactions/${docId}`;
    try {
      await deleteDoc(doc(db, 'interactions', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Tasks
  async getTasks(leadId: string | number) {
    const docId = String(leadId);
    const path = 'tasks';
    try {
      const q = query(collection(db, path), where('lead_id', '==', docId), orderBy('due_date', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createTask(task: any) {
    const path = 'tasks';
    try {
      const taskData = {
        ...task,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), taskData);
      return { id: docRef.id, ...taskData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateTask(id: string | number, updates: any) {
    const docId = String(id);
    const path = `tasks/${docId}`;
    try {
      await updateDoc(doc(db, 'tasks', docId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteTask(id: string | number) {
    const docId = String(id);
    const path = `tasks/${docId}`;
    try {
      await deleteDoc(doc(db, 'tasks', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Settings
  async getSettings() {
    const path = 'settings';
    try {
      const q = query(collection(db, path), where('owner_id', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { company_name: 'HunterAI CRM', currency: 'BRL' };
      return snapshot.docs[0].data();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateSettings(settings: any) {
    const path = 'settings';
    try {
      const q = query(collection(db, path), where('owner_id', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      
      const settingsData = {
        ...settings,
        owner_id: auth.currentUser?.uid
      };

      if (snapshot.empty) {
        await addDoc(collection(db, path), settingsData);
      } else {
        await updateDoc(doc(db, path, snapshot.docs[0].id), settingsData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Profile
  async updateProfile(userId: string, updates: any) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), updates);
      return updates;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Quick Commands
  async getQuickCommands() {
    const path = 'quick_commands';
    try {
      const q = query(collection(db, path), orderBy('created_at', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createQuickCommand(command: string, result: string) {
    const path = 'quick_commands';
    try {
      const commandData = {
        command,
        result,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), commandData);
      return { id: docRef.id, ...commandData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteQuickCommand(id: string | number) {
    const docId = String(id);
    const path = `quick_commands/${docId}`;
    try {
      await deleteDoc(doc(db, 'quick_commands', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Import Batches
  async getImportBatches() {
    const path = 'import_batches';
    try {
      const q = query(collection(db, path), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async deleteImportBatch(id: string | number) {
    const docId = String(id);
    const path = `import_batches/${docId}`;
    try {
      await deleteDoc(doc(db, 'import_batches', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Saved Reports
  async getSavedReports() {
    const path = 'saved_reports';
    try {
      const q = query(collection(db, path), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createSavedReport(report: any) {
    const path = 'saved_reports';
    try {
      const reportData = {
        ...report,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), reportData);
      return { id: docRef.id, ...reportData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteSavedReport(id: string | number) {
    const docId = String(id);
    const path = `saved_reports/${docId}`;
    try {
      await deleteDoc(doc(db, 'saved_reports', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Stats
  async getDashboardStats(leads: any[], stages: any[]) {
    const totalLeads = leads.length;
    
    const closedStages = stages.filter(s => ['Fechamento', 'Indicação'].includes(s.name)).map(s => s.id);
    const closedLeads = leads.filter(l => closedStages.includes(l.stage_id)).length;
    
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";

    const closedLeadsData = leads.filter(l => closedStages.includes(l.stage_id));
    let avgDays = 0;
    if (closedLeadsData.length > 0) {
      const totalDays = closedLeadsData.reduce((acc, l) => {
        const created = new Date(l.created_at).getTime();
        const now = new Date().getTime();
        return acc + (now - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / closedLeadsData.length);
    }

    const advancedStages = stages.filter(s => ['Proposta', 'Follow up', 'Fechamento'].includes(s.name)).map(s => s.id);
    const advancedLeadsCount = leads.filter(l => advancedStages.includes(l.stage_id)).length;
    const estimatedRevenue = (advancedLeadsCount * 15000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const stageDistribution = stages.map(s => ({
      name: s.name,
      count: leads.filter(l => l.stage_id === s.id).length
    }));

    return {
      totalLeads,
      conversionRate: `${conversionRate}%`,
      avgTime: avgDays > 0 ? `${avgDays} dias` : 'N/A',
      estimatedRevenue,
      stageDistribution,
      recentInteractions: []
    };
  }
};
