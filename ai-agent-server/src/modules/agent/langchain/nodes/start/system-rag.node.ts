import { AgentState } from '../../../interfaces/agent.interface';
import { RagService } from '../../../../rag/rag.service';

export class SystemRagNode {
  constructor(private ragService: RagService) {}

  async invoke(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const businessType = state.businessInfo?.businessType || 'general';
      const userRole = state.role || 'client_nou';
      
      // Load all system instructions for this business type
      const allInstructions = await this.ragService.listActiveSystemInstructions(businessType);
      
      // Find role-specific instruction from database
      const roleSpecificInstruction = await this.findRoleSpecificInstruction(userRole, businessType);
      
      // Filter instructions based on user role for security
      const filteredInstructions = this.filterInstructionsByRole(allInstructions || [], userRole);
      
      // Combine role-specific instruction with filtered instructions
      const systemInstructions = roleSpecificInstruction ? [roleSpecificInstruction, ...filteredInstructions] : filteredInstructions;
      
      console.log(`SystemRagNode: Loaded ${systemInstructions.length} instructions for ${userRole} in ${businessType}`);
      return { systemInstructions };
    } catch (error) {
      console.warn('SystemRagNode: failed to load system instructions', error);
      return { systemInstructions: [] };
    }
  }

  private async findRoleSpecificInstruction(userRole: string, businessType: string): Promise<any | null> {
    try {
      // Determine the role key and instruction key
      const roleKey = userRole === 'operator' ? 'operator' : 'client';
      const instructionKey = `${businessType}.${roleKey}.${roleKey === 'operator' ? 'complete_guidance' : 'limited_access'}.v1`;
      
      console.log(`SystemRagNode: Looking for instruction with key: "${instructionKey}" for role: ${userRole}, businessType: ${businessType}`);
      
      // Try to get the specific instruction from database
      const dbInstruction = await this.ragService.getSystemInstructionByKey(instructionKey);
      
      if (dbInstruction && dbInstruction.isActive) {
        console.log(`SystemRagNode: Found role-specific instruction: ${instructionKey}`);
        
        // Convert database instruction to the format expected by the system
        return {
          id: dbInstruction.key,
          instruction: this.formatInstructionFromDB(dbInstruction),
          active: dbInstruction.isActive,
          role: roleKey,
          capabilities: dbInstruction.instructionsJson?.capabilities || {},
          metadata: {
            source: 'database',
            businessType: dbInstruction.businessType,
            category: dbInstruction.category,
            version: dbInstruction.version
          }
        };
      }
      
      // Fallback to general instruction if specific one not found
      const generalKey = `general.${roleKey}.base_guidance.v1`;
      const generalInstruction = await this.ragService.getSystemInstructionByKey(generalKey);
      
      if (generalInstruction && generalInstruction.isActive) {
        console.log(`SystemRagNode: Using general instruction: ${generalKey}`);
        
        return {
          id: generalInstruction.key,
          instruction: this.formatInstructionFromDB(generalInstruction),
          active: generalInstruction.isActive,
          role: roleKey,
          capabilities: generalInstruction.instructionsJson?.capabilities || {},
          metadata: {
            source: 'database_general',
            businessType: generalInstruction.businessType,
            category: generalInstruction.category,
            version: generalInstruction.version
          }
        };
      }
      
      // Final fallback to hardcoded instructions
      console.log(`SystemRagNode: No database instruction found, using hardcoded fallback for ${roleKey}`);
      return this.createHardcodedInstruction(userRole, businessType);
      
    } catch (error) {
      console.warn('SystemRagNode: Error finding role-specific instruction:', error);
      return this.createHardcodedInstruction(userRole, businessType);
    }
  }

  private formatInstructionFromDB(dbInstruction: any): string {
    const instructions = dbInstruction.instructionsJson?.instructions;
    if (!instructions) {
      return 'Instrucțiune de sistem din baza de date.';
    }
    
    let formattedInstruction = instructions.primary || '';
    
    if (instructions.data_access) {
      formattedInstruction += ` ${instructions.data_access}`;
    }
    
    if (instructions.response_style) {
      formattedInstruction += ` ${instructions.response_style}`;
    }
    
    if (instructions.guidance) {
      formattedInstruction += ` ${instructions.guidance}`;
    }
    
    return formattedInstruction;
  }

  private createHardcodedInstruction(userRole: string, businessType: string): any {
    if (userRole === 'operator') {
      return {
        id: 'operator-base-strategy-hardcoded',
        instruction: `Ești un operator pentru un business de tip ${businessType}. Ai acces complet la toate datele și resursele. Răspunsurile tale trebuie să fie scurte și concise, focusate pe informațiile esențiale. Poți lista medici, tratamente, rezervări și poți ajuta clienții să facă programări. Identifică rolul utilizatorului și oferă asistență adecvată.`,
        active: true,
        role: 'operator',
        capabilities: {
          canAccessAllData: true,
          canViewPersonalInfo: true,
          canModifyReservations: true,
          canListAllResources: true,
          responseStyle: 'concise'
        },
        metadata: {
          source: 'hardcoded',
          businessType: businessType,
          category: 'operator_guidelines'
        }
      };
    } else {
      return {
        id: 'client-base-strategy-hardcoded',
        instruction: `Ești un asistent pentru clienții unui business de tip ${businessType}. Poți lista serviciile disponibile, medici și programări generale pentru a ghida clientul să facă o programare. NU ai acces la datele personale ale altor clienți sau rezervări specifice. Răspunsurile tale trebuie să fie prietenoase și să ghideze clientul către informațiile de care are nevoie pentru a face o programare.`,
        active: true,
        role: 'client',
        capabilities: {
          canAccessAllData: false,
          canViewPersonalInfo: false,
          canModifyReservations: false,
          canListAllResources: true,
          responseStyle: 'friendly_guidance'
        },
        metadata: {
          source: 'hardcoded',
          businessType: businessType,
          category: 'client_guidelines'
        }
      };
    }
  }

  private filterInstructionsByRole(instructions: any[], userRole: string): any[] {
    if (userRole === 'operator') {
      // Operators have access to all instructions
      return instructions;
    } else {
      // Clients/Webhooks have limited access - filter out sensitive instructions
      return instructions.filter(instruction => {
        // Check if instruction has role restrictions
        const instructionRole = instruction.instructionsJson?.role;
        if (instructionRole === 'operator') {
          return false; // Exclude operator-only instructions
        }
        
        // Filter out instructions that contain sensitive keywords
        const sensitiveKeywords = [
          'clienti_personali',
          'rezervari_specifice', 
          'date_personale',
          'istoric_complet',
          'admin',
          'operator',
          'coordonator'
        ];
        
        const instructionText = (instruction.instruction || '').toLowerCase();
        const instructionsJsonText = JSON.stringify(instruction.instructionsJson || {}).toLowerCase();
        
        return !sensitiveKeywords.some(keyword => 
          instructionText.includes(keyword) || instructionsJsonText.includes(keyword)
        );
      });
    }
  }
}


