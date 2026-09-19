const MiRed = () => {
  const referidos = [
    { id: 1, nombre: "Ana García", nivel: "Nivel 1", ventas: "$1,200" },
    { id: 2, nombre: "Luis Poveda", nivel: "Nivel 1", ventas: "$850" },
    { id: 3, nombre: "Marta Sánchez", nivel: "Nivel 2", ventas: "$430" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        Mi Red de Referidos
      </h1>

      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[520px]">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="p-4 font-semibold text-stone-600">Nombre</th>
              <th className="p-4 font-semibold text-stone-600">Jerarquía</th>
              <th className="p-4 font-semibold text-stone-600">
                Ventas Mensuales
              </th>
            </tr>
          </thead>

          <tbody>
            {referidos.map((ref) => (
              <tr
                key={ref.id}
                className="border-b border-stone-100 hover:bg-stone-50"
              >
                <td className="p-4 text-stone-700">{ref.nombre}</td>
                <td className="p-4 text-stone-500">{ref.nivel}</td>
                <td className="p-4 text-orange-600 font-medium">
                  {ref.ventas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MiRed;